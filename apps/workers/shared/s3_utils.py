# ============================================================
# Shared S3 / MinIO helper
# ============================================================
import logging
from io import BytesIO

import boto3
from botocore.config import Config as BotoConfig

from shared.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
    return _s3_client


def download_file(bucket: str, key: str) -> bytes:
    """Download a file from S3/MinIO."""
    client = get_s3_client()
    buf = BytesIO()
    client.download_fileobj(bucket, key, buf)
    logger.info(f"Downloaded s3://{bucket}/{key} ({buf.tell()} bytes)")
    return buf.getvalue()


def upload_file(
    bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
):
    """Upload a file to S3/MinIO."""
    client = get_s3_client()
    client.upload_fileobj(
        BytesIO(data), bucket, key, ExtraArgs={"ContentType": content_type}
    )
    logger.info(f"Uploaded s3://{bucket}/{key} ({len(data)} bytes)")


def generate_presigned_upload_url(bucket: str, key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for direct upload."""
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )
