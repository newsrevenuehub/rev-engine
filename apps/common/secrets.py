import logging

from django.conf import settings

from google.api_core.exceptions import NotFound, PermissionDenied
from google.cloud.secretmanager import SecretManagerServiceClient


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class SecretProviderException(Exception):
    """Base class for exceptions in this module."""


class SecretProvider:

    """A descriptor that retrieves a secret from a secret manager."""

    def __init__(self, version_id: str = "latest", *args, **kwargs) -> None:
        self.version_id = version_id

    def __get__(self, obj, type=None) -> object:
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement __get__ but does not")

    def __set__(self, obj, value) -> None:
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement __set__ but does not")

    def __delete__(self, obj) -> None:
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement delete_secret but does not")

    def __str__(self) -> str:
        return f"{self.name}"


class GoogleCloudSecretProvider(SecretProvider):
    """A descriptor that retrieves a secret from Google Cloud Secret Manager."""

    client = SecretManagerServiceClient()

    def __init__(
        self,
        model_attr: str,
        project_id: str = settings.GOOGLE_CLOUD_PROJECT,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.model_attr = model_attr
        self.project_id = project_id

    @property
    def project_path(self) -> str:
        return f"projects/{self.project_id}"

    def get_secret_name(self, obj) -> str:
        return getattr(obj, self.model_attr)

    def get_secret_path(self, obj) -> str:
        return f"{self.project_path}/secrets/{self.get_secret_name(obj)}"

    def get_secret_version_path(self, obj) -> str:
        return f"{self.get_secret_path(obj)}/versions/{self.version_id}"

    def __get__(self, obj, type=None) -> str | None:
        logger.info("GoogleCloudSecretProvider retrieving secret %s", (secret_name := self.get_secret_name(obj)))
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.debug(
                "GoogleCloudSecretProvider.get_secret for secret %s returning None because ENABLE_GOOGLE_CLOUD_SECRET_MANAGER isn't true",
                secret_name,
            )
            return None
        try:
            secret = self.client.access_secret_version(
                request={"name": (secret_version_path := self.get_secret_version_path(obj))}
            )
        except NotFound:
            logger.debug(
                "GoogleCloudSecretProvider.get_secret did not find secret version for secret %s with path %s",
                secret_name,
                secret_version_path,
            )
            return None
        except PermissionDenied:
            logger.exception(
                "GoogleCloudSecretProvider.get_secret cannot access secret version for secret %s with path %s because permission denied",
                secret_name,
                secret_version_path,
            )
            raise SecretProviderException("Permission denied")

        else:  # If no exception is raised, then the secret was found
            return secret.payload.data.decode("UTF-8")

    def __set__(self, obj, value) -> None:
        secret_name = self.get_secret_name(obj)
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.debug(
                "GoogleCloudSecretProvider.__set__ cannot set secret value for secret %s because ENABLE_GOOGLE_CLOUD_SECRET_MANAGER not true",
                secret_name,
            )
            return
        secret = None
        try:
            secret = self.client.get_secret(request={"name": (secret_path := self.get_secret_path(obj))})
        except NotFound:
            logger.debug(
                "GoogleCloudSecretProvider did not find an existing secret for secret %s. Creating new secret.",
                secret_name,
            )
            try:
                secret = self.client.create_secret(
                    request={
                        "parent": self.client.secret_path(self.project_id, secret_name),
                        "secret_id": secret_name,
                    }
                )
                logger.debug("GoogleCloudSecretProvider created a new GC secret for %s", secret_name)
            except PermissionDenied:
                logger.exception(
                    "GoogleCloudSecretProvider cannot create secret for secret %s at path %s because permission denied",
                    secret_name,
                    secret_path,
                )
                raise SecretProviderException("Permission denied")
        except PermissionDenied:
            logger.exception(
                "GoogleCloudSecretProvider cannot check for existing secret %s at path %s because permission denied",
                secret_name,
                secret_path,
            )
            raise SecretProviderException("Permission denied")

        if secret:
            try:
                logger.info("GoogleCloudSecretProvider adding secret version for secret %s", secret_name)
                self.client.add_secret_version(
                    request={
                        "parent": secret_path,
                        "payload": {"data": value.encode("UTF-8")},
                    }
                )
                return
            except PermissionDenied:
                logger.exception(
                    "`GoogleCloudSecretProvider cannot add secret version for secret %s because permission denied",
                    secret_name,
                )
                raise SecretProviderException("Permission denied")

    def __delete__(self, obj) -> None:
        secret_name = self.get_secret_name(obj)
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.info(
                "GoogleCloudSecretProvider cannot delete secret %s on GC because ENABLE_GOOGLE_CLOUD_SECRET_MANAGER not true",
                secret_name,
            )
            return
        try:
            self.client.delete_secret(request={"name": (secret_path := self.get_secret_path(obj))})
            logger.info("GoogleCloudSecretProvider deleted secret %s", secret_name)
        except NotFound:
            logger.debug(
                "GoogleCloudSecretProvider could delete secret %s at path because not found", secret_name, secret_path
            )
            return
        except PermissionDenied:
            logger.exception("GoogleCloudSecretProvider cannot delete secret %s because permission denied", secret_name)
            raise SecretProviderException("Permission denied")
