"""
S3 Service — uploads, downloads, deletes.
Falls back to local filesystem when AWS credentials are not configured.
"""
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import settings

logger = logging.getLogger(__name__)

LOCAL_UPLOAD_DIR = Path("./uploads")
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class S3Service:
    def __init__(self):
        self._client = None
        self._use_s3 = settings.use_s3

    def _get_client(self):
        if self._client is None and self._use_s3:
            self._client = boto3.client(
                "s3",
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region,
            )
        return self._client

    @property
    def storage_type(self) -> str:
        return "AWS S3" if self._use_s3 else "Local Filesystem"

    def upload_file(self, file_bytes: bytes, filename: str, content_type: str) -> dict:
        """Upload file and return {'s3_key': ..., 'local_path': ...}"""
        unique_key = f"{uuid.uuid4()}_{filename}"

        if self._use_s3:
            try:
                client = self._get_client()
                client.put_object(
                    Bucket=settings.aws_s3_bucket,
                    Key=unique_key,
                    Body=file_bytes,
                    ContentType=content_type,
                )
                logger.info(f"Uploaded {filename} to S3 key: {unique_key}")
                return {"s3_key": unique_key, "local_path": None}
            except (ClientError, NoCredentialsError) as e:
                logger.error(f"S3 upload failed: {e}. Falling back to local.")
                # fallthrough to local

        # Local fallback
        local_path = LOCAL_UPLOAD_DIR / unique_key
        local_path.write_bytes(file_bytes)
        logger.info(f"Stored {filename} locally at: {local_path}")
        return {"s3_key": None, "local_path": str(local_path)}

    def download_file(self, s3_key: Optional[str], local_path: Optional[str]) -> bytes:
        """Download file content."""
        if s3_key and self._use_s3:
            try:
                client = self._get_client()
                response = client.get_object(Bucket=settings.aws_s3_bucket, Key=s3_key)
                return response["Body"].read()
            except ClientError as e:
                logger.error(f"S3 download failed: {e}")
                raise

        if local_path and os.path.exists(local_path):
            return Path(local_path).read_bytes()

        raise FileNotFoundError(f"File not found: s3_key={s3_key}, local={local_path}")

    def delete_file(self, s3_key: Optional[str], local_path: Optional[str]) -> bool:
        """Delete file from storage."""
        if s3_key and self._use_s3:
            try:
                client = self._get_client()
                client.delete_object(Bucket=settings.aws_s3_bucket, Key=s3_key)
                logger.info(f"Deleted S3 object: {s3_key}")
                return True
            except ClientError as e:
                logger.error(f"S3 delete failed: {e}")
                return False

        if local_path and os.path.exists(local_path):
            os.remove(local_path)
            logger.info(f"Deleted local file: {local_path}")
            return True

        return False

    def get_presigned_url(self, s3_key: str, expiry: int = 3600) -> Optional[str]:
        """Generate presigned URL for S3 object."""
        if not self._use_s3:
            return None
        try:
            client = self._get_client()
            url = client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.aws_s3_bucket, "Key": s3_key},
                ExpiresIn=expiry,
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None


s3_service = S3Service()
