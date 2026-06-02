# ============================================================
# Worker A — Resume & JD Parser (Complete Implementation)
# ============================================================
import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone

import aio_pika
import asyncpg
from fastapi import FastAPI

from shared.config import settings
from shared.parser_utils import (
    extract_text_from_pdf,
    extract_text_from_docx,
    chunk_text,
)
from shared.ai_utils import (
    generate_embedding,
    extract_resume_entities,
    parse_job_description,
)
from shared.s3_utils import download_file

logger = logging.getLogger(__name__)

app = FastAPI(title="Worker A — Resume/JD Parser", version="0.2.0")

_db_pool: asyncpg.Pool | None = None


@app.get("/health")
async def health():
    has_openai = bool(
        settings.openai_api_key and not settings.openai_api_key.startswith("sk-***")
    )
    return {
        "status": "ok",
        "worker": "resume-parser",
        "features": {"pdf": True, "docx": True, "openai": has_openai},
    }


async def get_db_pool() -> asyncpg.Pool:
    global _db_pool
    if _db_pool is None:
        _db_pool = await asyncpg.create_pool(
            settings.database_url, min_size=2, max_size=5
        )
    return _db_pool


def _fmt_embedding(emb: list[float] | None) -> str | None:
    if emb is None:
        return None
    return f"[{','.join(str(v) for v in emb)}]"


async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        body = json.loads(message.body.decode())
        task_id = body.get("taskId", "unknown")
        task_type = body.get("taskType", "UNKNOWN")
        payload = body.get("payload", {})
        logger.info(f"Processing {task_type} | task={task_id}")

        try:
            if task_type == "PARSE_RESUME":
                await _parse_resume(task_id, payload)
            elif task_type == "PARSE_JD":
                await _parse_jd(task_id, payload)
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}\n{traceback.format_exc()}")
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE resumes SET status='PARSE_FAILED', \"parseError\"=$2 WHERE id=$1",
                    task_id,
                    str(e),
                )


async def _parse_resume(task_id: str, payload: dict):
    s3_key = payload["s3Key"]
    file_type = payload.get("fileType", "pdf")

    file_bytes = download_file(settings.s3_bucket_resumes, s3_key)
    raw_text = (
        extract_text_from_pdf(file_bytes)
        if file_type == "pdf"
        else extract_text_from_docx(file_bytes)
    )

    if not raw_text or len(raw_text.strip()) < 50:
        raise ValueError("Text too short — possibly a scanned PDF")

    logger.info(f"Extracted {len(raw_text)} chars, chunking...")
    chunks = chunk_text(raw_text)
    logger.info(f"{len(chunks)} chunks")

    parsed = await extract_resume_entities(raw_text)
    embedding = await generate_embedding(raw_text[:8000])
    emb_str = _fmt_embedding(embedding)

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if emb_str:
            await conn.execute(
                'UPDATE resumes SET status=$2, "rawText"=$3, "parsedData"=$4, embedding=$5::vector, "parsedAt"=$6 WHERE id=$1',
                task_id,
                "PARSED",
                raw_text,
                json.dumps(parsed, ensure_ascii=False),
                emb_str,
                datetime.now(timezone.utc),
            )
        else:
            await conn.execute(
                'UPDATE resumes SET status=$2, "rawText"=$3, "parsedData"=$4, "parsedAt"=$5 WHERE id=$1',
                task_id,
                "PARSED",
                raw_text,
                json.dumps(parsed, ensure_ascii=False),
                datetime.now(timezone.utc),
            )
    logger.info(f"Resume {task_id} → PARSED ({len(parsed.get('skills', []))} skills)")


async def _parse_jd(task_id: str, payload: dict):
    s3_key = payload.get("s3Key")
    raw_text = payload.get("rawText", "")
    if s3_key:
        file_bytes = download_file(settings.s3_bucket_resumes, s3_key)
        raw_text = extract_text_from_pdf(file_bytes)

    parsed = await parse_job_description(raw_text)
    embedding = await generate_embedding(raw_text[:8000])
    emb_str = _fmt_embedding(embedding)

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if emb_str:
            await conn.execute(
                'UPDATE jobs SET description=$2, "enrichedData"=$3, embedding=$4::vector WHERE id=$1',
                task_id,
                raw_text,
                json.dumps(parsed, ensure_ascii=False),
                emb_str,
            )
        else:
            await conn.execute(
                'UPDATE jobs SET description=$2, "enrichedData"=$3 WHERE id=$1',
                task_id,
                raw_text,
                json.dumps(parsed, ensure_ascii=False),
            )
    logger.info(f"Job {task_id} enriched")


async def start_consumer():
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=2)
        queue = await channel.declare_queue("parse", durable=True)
        await queue.consume(process_message)
        logger.info("Worker A listening on 'parse' queue...")
        await asyncio.Future()


if __name__ == "__main__":
    import uvicorn

    asyncio.ensure_future(start_consumer())
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level=settings.log_level.lower())
