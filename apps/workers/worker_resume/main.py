"""Worker A — Resume & JD Parser (PDF-only, DeepSeek AI)"""

import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone

import aio_pika
import asyncpg
from fastapi import FastAPI

from shared.config import settings
from shared.parser_utils import extract_text_from_pdf, rule_based_extraction
from shared.ai_utils import (
    generate_embedding,
    extract_resume_entities,
    parse_job_description,
)
from shared.s3_utils import download

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), "INFO"))
logger = logging.getLogger("worker-resume")

app = FastAPI(title="Worker A — Resume/JD Parser", version="0.3.0")
_pool: asyncpg.Pool | None = None


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "worker": "resume-parser",
        "pdf": True,
        "deepseek": settings.has_ai(),
        "embedding": settings.has_emb(),
    }


async def _db():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.db, min_size=2, max_size=5)
    return _pool


def _emb_str(emb: list[float] | None) -> str | None:
    if emb is None:
        return None
    return f"[{','.join(str(v) for v in emb)}]"


async def _update_resume(rid: str, raw: str, parsed: dict, emb: str | None):
    pool = await _db()
    async with pool.acquire() as conn:
        if emb:
            await conn.execute(
                """UPDATE resumes SET status='PARSED', "rawText"=$2, "parsedData"=$3, embedding=$4::vector, "parsedAt"=$5 WHERE id=$1""",
                rid,
                raw,
                json.dumps(parsed, ensure_ascii=False),
                emb,
                datetime.now(timezone.utc),
            )
        else:
            await conn.execute(
                """UPDATE resumes SET status='PARSED', "rawText"=$2, "parsedData"=$3, "parsedAt"=$4 WHERE id=$1""",
                rid,
                raw,
                json.dumps(parsed, ensure_ascii=False),
                datetime.now(timezone.utc),
            )
    logger.info(f"Resume {rid} → PARSED ({len(parsed.get('skills', []))} skills)")


async def _update_job(jid: str, raw: str, parsed: dict, emb: str | None):
    pool = await _db()
    async with pool.acquire() as conn:
        if emb:
            await conn.execute(
                """UPDATE jobs SET description=$2, "enrichedData"=$3, embedding=$4::vector WHERE id=$1""",
                jid,
                raw,
                json.dumps(parsed, ensure_ascii=False),
                emb,
            )
        else:
            await conn.execute(
                """UPDATE jobs SET description=$2, "enrichedData"=$3 WHERE id=$1""",
                jid,
                raw,
                json.dumps(parsed, ensure_ascii=False),
            )
    logger.info(f"Job {jid} enriched")


async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        body = json.loads(message.body.decode())
        tid = body.get("taskId", "?")
        ttype = body.get("taskType", "?")
        payload = body.get("payload", {})
        logger.info(f"[{ttype}] task={tid}")

        try:
            if ttype == "PARSE_RESUME":
                s3key = payload["s3Key"]
                data = download(settings.s3_bucket, s3key)
                raw = extract_text_from_pdf(data)
                if not raw or len(raw.strip()) < 50:
                    raise ValueError("PDF text too short — may be scanned/image-based")
                logger.info(f"Extracted {len(raw)} chars")
                parsed = await extract_resume_entities(raw)
                emb = await generate_embedding(raw[:8000])
                await _update_resume(tid, raw, parsed, _emb_str(emb))

            elif ttype == "PARSE_JD":
                s3key = payload.get("s3Key")
                raw_text = payload.get("rawText", "")
                if s3key:
                    data = download(settings.s3_bucket, s3key)
                    raw_text = extract_text_from_pdf(data)
                if not raw_text:
                    raise ValueError("No text provided")
                parsed = await parse_job_description(raw_text)
                emb = await generate_embedding(raw_text[:8000])
                await _update_job(tid, raw_text, parsed, _emb_str(emb))

        except Exception as e:
            logger.error(f"Task {tid} FAILED: {e}\n{traceback.format_exc()}")
            pool = await _db()
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE resumes SET status='PARSE_FAILED', \"parseError\"=$2 WHERE id=$1",
                    tid,
                    str(e),
                )


async def _consume():
    conn = await aio_pika.connect_robust(settings.rabbitmq)
    async with conn:
        ch = await conn.channel()
        await ch.set_qos(prefetch_count=2)
        q = await ch.declare_queue("parse", durable=True)
        await q.consume(process_message)
        logger.info("Worker A listening on 'parse' queue...")
        await asyncio.Future()


if __name__ == "__main__":
    import uvicorn

    asyncio.ensure_future(_consume())
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level=settings.log_level.lower())
