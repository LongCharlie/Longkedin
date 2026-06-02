"""Settings — loads .env from project root, no heavy deps."""

import os
from dotenv import load_dotenv

# Load .env from monorepo root (3 levels up from shared/)
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_root, ".env"))


class Settings:
    db = os.getenv(
        "DATABASE_URL", "postgresql://longkedin:longkedin@localhost:5432/longkedin"
    )
    redis = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    rabbitmq = os.getenv("RABBITMQ_URL", "amqp://longkedin:longkedin@localhost:5672")
    s3_endpoint = os.getenv("S3_ENDPOINT", "http://localhost:9000")
    s3_access = os.getenv("S3_ACCESS_KEY", "minioadmin")
    s3_secret = os.getenv("S3_SECRET_KEY", "minioadmin")
    s3_bucket = os.getenv("S3_BUCKET_RESUMES", "longkedin-resumes")
    s3_region = os.getenv("S3_REGION", "us-east-1")

    # DeepSeek
    ds_key = os.getenv("DEEPSEEK_API_KEY", "")
    ds_base = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    ds_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # OpenAI (embedding only)
    oai_key = os.getenv("OPENAI_API_KEY", "")
    oai_emb = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    log_level = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def has_ai(cls) -> bool:
        return bool(cls.ds_key) and len(cls.ds_key) > 10

    @classmethod
    def has_emb(cls) -> bool:
        return bool(cls.oai_key) and len(cls.oai_key) > 10


settings = Settings()
