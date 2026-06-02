"""MinIO/S3 helpers."""

import io
import logging
import boto3
from botocore.config import Config
from shared.config import settings

logger = logging.getLogger(__name__)
_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access,
            aws_secret_access_key=settings.s3_secret,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
    return _s3


def download(bucket: str, key: str) -> bytes:
    buf = io.BytesIO()
    _client().download_fileobj(bucket, key, buf)
    logger.info(f"Downloaded s3://{bucket}/{key} ({buf.tell()} bytes)")
    return buf.getvalue()


def upload(
    bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
):
    _client().upload_fileobj(
        io.BytesIO(data), bucket, key, ExtraArgs={"ContentType": content_type}
    )
    logger.info(f"Uploaded s3://{bucket}/{key} ({len(data)} bytes)")


def presigned_upload_url(bucket: str, key: str, expires: int = 3600) -> str:
    return _client().generate_presigned_url(
        "put_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires
    )
