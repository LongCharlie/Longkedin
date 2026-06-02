"""
Workers Config — DeepSeek-powered AI with OpenAI embedding fallback.
No heavy dependencies (pydantic-settings removed).
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))


class Settings:
    def __init__(self):
        self.database_url = os.getenv(
            "DATABASE_URL", "postgresql://longkedin:longkedin@localhost:5432/longkedin"
        )
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.rabbitmq_url = os.getenv(
            "RABBITMQ_URL", "amqp://longkedin:longkedin@localhost:5672"
        )

        self.s3_endpoint = os.getenv("S3_ENDPOINT", "http://localhost:9000")
        self.s3_access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
        self.s3_secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
        self.s3_bucket_resumes = os.getenv("S3_BUCKET_RESUMES", "longkedin-resumes")
        self.s3_bucket_recordings = os.getenv(
            "S3_BUCKET_RECORDINGS", "longkedin-recordings"
        )
        self.s3_region = os.getenv("S3_REGION", "us-east-1")

        # DeepSeek (primary AI)
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.deepseek_base_url = os.getenv(
            "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
        )
        self.deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

        # OpenAI (embedding only — DeepSeek has no embedding API)
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_embedding_model = os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )

        self.log_level = os.getenv("LOG_LEVEL", "INFO")

    @property
    def has_ai(self) -> bool:
        return bool(self.deepseek_api_key) and len(self.deepseek_api_key) > 10

    @property
    def has_embedding(self) -> bool:
        return bool(self.openai_api_key) and len(self.openai_api_key) > 10


settings = Settings()
