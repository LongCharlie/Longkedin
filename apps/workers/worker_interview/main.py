"""Worker C — Interview Simulator (DeepSeek-powered)"""

import asyncio
import json
import logging

import aio_pika
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from shared.config import settings
from shared.ai_utils import _get_ds  # reuse DeepSeek client

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), "INFO"))
logger = logging.getLogger("worker-interview")

app = FastAPI(title="Worker C — Interview Simulator", version="0.3.0")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "worker": "interview-simulator",
        "deepseek": settings.has_ai(),
    }


@app.websocket("/ws/interview/{room_id}")
async def ws(websocket: WebSocket, room_id: str):
    await websocket.accept()
    logger.info(f"Interview session {room_id} started")
    transcript: list[dict] = []

    try:
        while True:
            msg = await websocket.receive_json()
            if msg.get("type") == "audio_frame":
                # In production: send to Whisper API for transcription
                # For now, echo back placeholder
                await websocket.send_json(
                    {"type": "transcript", "text": "[语音转写中...]", "is_final": False}
                )

            elif msg.get("type") == "end_speaking":
                user_text = msg.get("text", "")
                transcript.append({"role": "user", "content": user_text})

                # Generate AI follow-up question
                follow_up = await _generate_follow_up(transcript)
                await websocket.send_json({"type": "question", "text": follow_up})

                # Generate feedback
                feedback = await _analyze_answer(user_text)
                await websocket.send_json({"type": "feedback", **feedback})

    except WebSocketDisconnect:
        logger.info(f"Interview {room_id} ended")


async def _generate_follow_up(history: list[dict]) -> str:
    client = _get_ds()
    if client is None:
        return "请继续描述你的经历。"

    try:
        r = client.chat.completions.create(
            model=settings.ds_model,
            messages=[
                {
                    "role": "system",
                    "content": "你是专业的面试官。根据候选人的回答，提出一个有深度的追问（中文，简短）。",
                },
                *history[-4:],
            ],
            max_tokens=200,
            temperature=0.7,
        )
        return r.choices[0].message.content or "请继续。"
    except Exception:
        return "请详细描述你是如何解决这个问题的？"


async def _analyze_answer(text: str) -> dict:
    client = _get_ds()
    if client is None:
        return {"starScore": 50, "feedback": "AI 未配置"}

    try:
        r = client.chat.completions.create(
            model=settings.ds_model,
            messages=[
                {
                    "role": "system",
                    "content": '评估面试回答。返回JSON: {"starScore":0-100,"feedback":"简短评价"}',
                },
                {"role": "user", "content": text},
            ],
            max_tokens=200,
            temperature=0.3,
        )
        content = r.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
        return json.loads(content)
    except Exception:
        return {"starScore": 60, "feedback": "回答完整，建议增加具体数据。"}


async def _consume():
    conn = await aio_pika.connect_robust(settings.rabbitmq)
    async with conn:
        ch = await conn.channel()
        q = await ch.declare_queue("interview", durable=True)
        await q.consume(lambda msg: msg.ack())  # placeholder
        logger.info("Worker C listening...")
        await asyncio.Future()


if __name__ == "__main__":
    import uvicorn

    asyncio.ensure_future(_consume())
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level=settings.log_level.lower())
