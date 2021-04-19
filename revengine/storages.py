from storages.backends.s3boto3 import S3Boto3Storage
from storages.utils import setting


class MediaBoto3Storage(S3Boto3Storage):  # pragma: no cover
    """
    Custom storage to allow an S3 bucket to be configured specifically
    for uploaded media.
    """

    bucket_name = setting("MEDIA_STORAGE_BUCKET_NAME", setting("AWS_STORAGE_BUCKET_NAME"))
    location = setting("MEDIA_LOCATION", setting("AWS_LOCATION", ""))
    custom_domain = setting("MEDIA_S3_CUSTOM_DOMAIN", setting("AWS_S3_CUSTOM_DOMAIN"))
