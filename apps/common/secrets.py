import logging

from django.conf import settings

from google.api_core.exceptions import NotFound, PermissionDenied
from google.cloud.secretmanager import SecretManagerServiceClient
from google.oauth2 import service_account


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class SecretProviderException(Exception):
    """Base class for exceptions in this module."""


class SecretProvider:

    """A descriptor that retrieves a secret from a secret manager."""

    def __init__(self, version_id: str = "latest", *args, **kwargs) -> None:
        self.version_id = version_id

    def __get__(self, obj, type=None) -> object:  # pragma: no cover
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement __get__ but does not")

    def __set__(self, obj, value) -> None:  # pragma: no cover
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement __set__ but does not")

    def __delete__(self, obj) -> None:  # pragma: no cover
        raise NotImplementedError("Subclasses of SecretProviderSecret should implement delete_secret but does not")

    def __str__(self) -> str:
        return f"{self.name}"


def get_secret_manager_client() -> SecretManagerServiceClient | None:
    # NB: This is defined in module scope and not in GoogleCloudSecretProvider even though it's only
    # caller because it facilitates mocking in tests across unit tests of secrets narrowly,
    # as well as their use in other contexts.
    if not settings.GS_CREDENTIALS:
        return None
    credentials = service_account.Credentials.from_service_account_info(settings.GS_CREDENTIALS)
    return SecretManagerServiceClient(credentials=credentials)


class GoogleCloudSecretProvider(SecretProvider):
    """A descriptor that retrieves a secret from Google Cloud Secret Manager."""

    def __init__(
        self,
        model_attr: str,
        *args,
        **kwargs,
    ) -> None:
        logger.info("GoogleCloudSecretProvider initializing with model_attr %s", model_attr)
        super().__init__(*args, **kwargs)
        self.model_attr = model_attr

    @property
    def project_path(self) -> str:
        return f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}"

    def get_secret_name(self, obj) -> str:
        return getattr(obj, self.model_attr)

    def get_secret_path(self, obj) -> str:
        return f"{self.project_path}/secrets/{self.get_secret_name(obj)}"

    def get_secret_version_path(self, obj) -> str:
        return f"{self.get_secret_path(obj)}/versions/{self.version_id}"

    def __get__(self, obj, type=None) -> str | None:
        logger.info("GoogleCloudSecretProvider retrieving secret %s", (secret_name := self.get_secret_name(obj)))
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.info("GoogleCloudSecretProvider not enabled")
            return None
        client = get_secret_manager_client()
        if not client:
            logger.warning(
                "GoogleCloudSecretProvider cannot get secret %s because client is not initialized", secret_name
            )
            return None
        try:
            secret = client.access_secret_version(
                request={"name": (secret_version_path := self.get_secret_version_path(obj))}
            )
        except NotFound:
            logger.info(
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

        return secret.payload.data.decode("UTF-8") if secret else None

    def __set__(self, obj, value) -> None:
        logger.info("GoogleCloudSecretProvider setting secret %s", (secret_name := self.get_secret_name(obj)))
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.warning("GoogleCloudSecretProvider cannot set secret %s because not enabled", secret_name)
            return
        secret = None
        client = get_secret_manager_client()
        if not client:
            logger.warning(
                "GoogleCloudSecretProvider cannot get secret %s because client is not initialized", secret_name
            )
            return None
        try:
            secret = client.get_secret(request={"name": (secret_path := self.get_secret_path(obj))})
        except NotFound:
            logger.info(
                "GoogleCloudSecretProvider did not find an existing secret for secret %s. Creating new secret.",
                secret_name,
            )
            try:
                logger.info("GoogleCloudSecretProvider attempting to create new secret for secret %s", secret_name)
                secret = client.create_secret(
                    request={
                        "parent": f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}",
                        "secret_id": secret_name,
                        "secret": {"replication": {"automatic": {}}},
                    }
                )
                logger.info("GoogleCloudSecretProvider created a new GC secret for %s", secret_name)
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
                client.add_secret_version(
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
        else:
            logger.warning("GoogleCloudSecretProvider failed to create secret %s", secret_name)

    def __delete__(self, obj) -> None:
        logger.info("GoogleCloudSecretProvider deleting secret %s", (secret_name := self.get_secret_name(obj)))
        secret_name = self.get_secret_name(obj)
        if not settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER:
            logger.warning(
                "GoogleCloudSecretProvider cannot delete secret %s because not enabled",
                secret_name,
            )
            return
        client = get_secret_manager_client()
        if not client:
            logger.warning(
                "GoogleCloudSecretProvider cannot delete secret %s because client is not initialized", secret_name
            )
            return None
        try:
            client.delete_secret(request={"name": (secret_path := self.get_secret_path(obj))})
            logger.info("GoogleCloudSecretProvider deleted secret %s", secret_name)
        except NotFound:
            logger.info(
                "GoogleCloudSecretProvider couldn't delete secret %s at path %s because not found",
                secret_name,
                secret_path,
            )
            return
        except PermissionDenied:
            logger.exception("GoogleCloudSecretProvider cannot delete secret %s because permission denied", secret_name)
            raise SecretProviderException("Permission denied")
