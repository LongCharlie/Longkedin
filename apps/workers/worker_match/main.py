# ============================================================
# Worker B — Match & Gap Analyzer
# Responsibilities:
#   1. Compute cosine similarity between resume & JD embeddings
#   2. RAG retrieval from skill reference DB
#   3. Generate gap analysis + resume suggestions (GPT-4o)
#   4. Generate customized cover letter draft
# ============================================================

import asyncio
import json
import logging

import aio_pika
from fastapi import FastAPI

from shared.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(title="Worker B — Match & Gap Analyzer", version="0.1.0")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "worker": "match-analyzer",
        "model": settings.openai_model,
    }


async def process_message(message: aio_pika.IncomingMessage):
    """
    Main message handler for match analysis tasks.

    Message format:
    {
        "taskId": "cuid_xxx",
        "taskType": "MATCH_JD" | "GENERATE_COVER_LETTER",
        "userId": "cuid_xxx",
        "payload": {
            "resumeId": "cuid_xxx",
            "jobId": "cuid_xxx"
        }
    }
    """
    async with message.process():
        body = json.loads(message.body.decode())
        task_id = body["taskId"]
        task_type = body["taskType"]

        logger.info(
            "Processing match task",
            extra={"task_id": task_id, "task_type": task_type},
        )

        try:
            if task_type == "MATCH_JD":
                result = await analyze_match(body["payload"])
            elif task_type == "GENERATE_COVER_LETTER":
                result = await generate_cover_letter(body["payload"])
            else:
                raise ValueError(f"Unknown task type: {task_type}")

            logger.info("Match task completed", extra={"task_id": task_id})

        except Exception as e:
            logger.error("Match task failed", extra={"task_id": task_id, "error": str(e)})


async def analyze_match(payload: dict) -> dict:
    """
    Full match analysis pipeline.

    Steps:
    1. Retrieve resume & JD embeddings from pgvector
    2. Compute cosine similarity (overall + per-skill)
    3. RAG: query skill reference DB for industry standards
    4. GPT-4o: gap analysis, suggestions, priority order
    """
    resume_id = payload["resumeId"]
    job_id = payload["jobId"]

    # TODO: Implement
    return {
        "score": 0,
        "missingSkills": [],
        "suggestions": [],
    }


async def generate_cover_letter(payload: dict) -> dict:
    """Generate a customized cover letter based on match analysis."""
    # TODO: Implement
    return {
        "coverLetter": "",
    }


async def start_consumer():
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue("match", durable=True)
        await queue.consume(process_message)
        logger.info("Worker B started, waiting for messages on 'match' queue...")
        await asyncio.Future()


if __name__ == "__main__":
    import uvicorn

    asyncio.ensure_future(start_consumer())
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level=settings.log_level.lower())
