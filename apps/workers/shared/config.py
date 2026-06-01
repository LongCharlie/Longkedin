# ============================================================
# Longkedin — Python AI Workers (Shared Configuration)
# ============================================================
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Shared settings for all AI Workers."""

    # --- Database ---
    database_url: str = Field(
        default="postgresql+asyncpg://longkedin:longkedin@localhost:5432/longkedin",
        alias="DATABASE_URL",
    )

    # --- Redis ---
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # --- RabbitMQ ---
    rabbitmq_url: str = Field(
        default="amqp://longkedin:longkedin@localhost:5672", alias="RABBITMQ_URL"
    )

    # --- S3 / MinIO ---
    s3_endpoint: str = Field(default="http://localhost:9000", alias="S3_ENDPOINT")
    s3_access_key: str = Field(default="minioadmin", alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", alias="S3_SECRET_KEY")
    s3_bucket_resumes: str = Field(default="longkedin-resumes", alias="S3_BUCKET_RESUMES")
    s3_bucket_recordings: str = Field(
        default="longkedin-recordings", alias="S3_BUCKET_RECORDINGS"
    )
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")

    # --- OpenAI ---
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o", alias="OPENAI_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small", alias="OPENAI_EMBEDDING_MODEL"
    )

    # --- Optional: ElevenLabs TTS ---
    elevenlabs_api_key: str | None = Field(default=None, alias="ELEVENLABS_API_KEY")

    # --- Observability ---
    otel_exporter_otlp_endpoint: str = Field(
        default="http://localhost:4318", alias="OTEL_EXPORTER_OTLP_ENDPOINT"
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # --- Worker ---
    worker_name: str = "shared"
    max_retries: int = 3

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
