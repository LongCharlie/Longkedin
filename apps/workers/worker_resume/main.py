# ============================================================
# Worker A — Resume & JD Parser
# Responsibilities:
#   1. Parse PDF/DOCX → raw text
#   2. Extract skills, experiences, education (spaCy NER + GPT-4o mini)
#   3. Generate vector embeddings (OpenAI text-embedding-3-small)
#   4. Write results to PostgreSQL (pgvector)
# ============================================================

import asyncio
import json
import logging
from pathlib import Path

import aio_pika
from fastapi import FastAPI

from shared.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(title="Worker A — Resume/JD Parser", version="0.1.0")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "worker": "resume-parser",
        "models": {
            "openai_model": settings.openai_model,
            "embedding_model": settings.openai_embedding_model,
        },
    }


async def process_message(message: aio_pika.IncomingMessage):
    """
    Main message handler for resume/JD parsing tasks.

    Message format:
    {
        "taskId": "cuid_xxx",
        "taskType": "PARSE_RESUME" | "PARSE_JD",
        "userId": "cuid_xxx",
        "payload": {
            "s3Key": "resumes/xxx.pdf",
            "fileType": "pdf" | "docx"
        },
        "metadata": {
            "idempotencyKey": "uuid",
            "traceId": "trace_xxx"
        }
    }
    """
    async with message.process():
        body = json.loads(message.body.decode())
        task_id = body["taskId"]
        task_type = body["taskType"]
        user_id = body["userId"]
        payload = body["payload"]

        logger.info(
            "Processing task",
            extra={
                "task_id": task_id,
                "task_type": task_type,
                "user_id": user_id,
                "trace_id": body.get("metadata", {}).get("traceId"),
            },
        )

        try:
            if task_type == "PARSE_RESUME":
                result = await parse_resume(payload)
            elif task_type == "PARSE_JD":
                result = await parse_jd(payload)
            else:
                raise ValueError(f"Unknown task type: {task_type}")

            # TODO: Write result to PostgreSQL
            # await update_resume_record(task_id, result)

            logger.info("Task completed", extra={"task_id": task_id})

        except Exception as e:
            logger.error("Task failed", extra={"task_id": task_id, "error": str(e)})
            # TODO: Update status to PARSE_FAILED
            # TODO: Implement retry logic / DLQ


async def parse_resume(payload: dict) -> dict:
    """
    Parse a resume PDF/DOCX.

    Steps:
    1. Download file from S3
    2. Extract text (PyPDF2 / python-docx)
    3. Chunk text (LangChain TextSplitter)
    4. Extract entities (spaCy NER + GPT-4o mini)
    5. Generate embeddings (OpenAI)
    6. Return structured result
    """
    # TODO: Implement
    s3_key = payload["s3Key"]
    file_type = payload["fileType"]

    # Placeholder
    return {
        "skills": [],
        "experiences": [],
        "education": [],
        "embedding": None,
    }


async def parse_jd(payload: dict) -> dict:
    """Parse a Job Description (JD)."""
    # TODO: Implement
    return {
        "skills_required": [],
        "skills_preferred": [],
        "level": "MID",
        "industry": "",
    }


async def start_consumer():
    """Connect to RabbitMQ and start consuming messages."""
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)

        queue = await channel.declare_queue("parse", durable=True)
        await queue.consume(process_message)

        logger.info("Worker A started, waiting for messages on 'parse' queue...")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    import uvicorn

    # Start FastAPI health server + RabbitMQ consumer
    asyncio.ensure_future(start_consumer())
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level=settings.log_level.lower())
