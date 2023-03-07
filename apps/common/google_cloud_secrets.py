import logging

from django.conf import settings

from google.api_core.exceptions import AlreadyExists, NotFound, PermissionDenied
from google.cloud import secretmanager
from google.cloud.secretmanager_v1.types import Secret, SecretVersion


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class GoogleCloudSecretManagerException(Exception):
    """"""


def get_secret_version(
    secret_id: str, version_id: str = "latest", project_id: str = settings.GOOGLE_CLOUD_PROJECT
) -> Secret:
    client = secretmanager.SecretManagerServiceClient()
    secret_detail = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
    try:
        secret = client.access_secret_version(request={"name": secret_detail})
        logger.info("`get_secret` retrieved secret with name %s", secret.name)
        return secret
    except PermissionDenied:
        logger.warning("`get_secret` cannot access secret %s", secret_detail)
        raise GoogleCloudSecretManagerException(f"Secret {secret_detail} is not accessible")
    except NotFound:
        logger.warning("`get_secret` cannot find a secret with secret_id %s in project %s", secret_id, project_id)
        raise GoogleCloudSecretManagerException(f"Secret with secret_id {secret_id} not found in project {project_id}")


def create_secret(secret_id: str, project_id: str = settings.GOOGLE_CLOUD_PROJECT) -> Secret:
    client = secretmanager.SecretManagerServiceClient()
    try:
        secret = client.create_secret(
            request={"parent": client.secret_path(project_id, secret_id), "secret_id": secret_id}
        )
        logger.info("`create_secret` created a new secret with name %s", secret.name)
        return secret
    # this happens when the project ID is invalid
    except PermissionDenied:
        logger.warning(
            "`create_secret` cannot create a secret with secret_id %s because project %s is not permitted",
            secret_id,
            project_id,
        )
        raise GoogleCloudSecretManagerException(
            f"Project {project_id} is not permitted to create a secret with secret_id {secret_id}"
        )
    except AlreadyExists:
        logger.warning(
            "`create_secret` cannot create a secret with secret_id %s because one already exists for project %s",
            secret_id,
            project_id,
        )
        raise GoogleCloudSecretManagerException(
            f"Secret with secret_id {secret_id} already exists for project {project_id}"
        )


def create_secret_version(
    secret_id: str, payload: str, project_id: str = settings.GOOGLE_CLOUD_PROJECT
) -> SecretVersion:
    client = secretmanager.SecretManagerServiceClient()
    parent = client.secret_path(project_id, secret_id)
    try:
        version = client.add_secret_version(request={"parent": parent, "payload": {"data": payload.encode("UTF-8")}})
        logger.info("`create_secret_version` created a new version for secret with name %s", version.name)
        return version
    # this happens when the project ID is invalid
    except PermissionDenied:
        logger.warning(
            "`create_secret_version` cannot create a secret version for secret_id %s because project %s is not permitted",
            secret_id,
            project_id,
        )
        raise GoogleCloudSecretManagerException(
            f"Project {project_id} is not permitted to create a secret version for secret_id {secret_id}"
        )
    except NotFound:
        logger.warning(
            "`create_secret_version` cannot create a secret version for secret_id %s because it does not exist in project %s",
            secret_id,
            project_id,
        )
        raise GoogleCloudSecretManagerException(
            f"Secret with secret_id {secret_id} does not exist in project {project_id}"
        )


def delete_secret(secret_id: str, project_id: str = settings.GOOGLE_CLOUD_PROJECT) -> None:
    client = secretmanager.SecretManagerServiceClient()
    try:
        client.delete_secret(request={"name": (name := client.secret_path(project_id, secret_id))})
        logger.info("`delete_secret` deleted secret with name %s", name)
    except PermissionDenied:
        logger.warning(
            "`delete_secret` cannot delete secret with name %s because project %s is not permitted", name, project_id
        )
        raise GoogleCloudSecretManagerException(
            f"The secret {secret_id} cannot be deleted for project {project_id}",
        )
    except NotFound:
        logger.warning("`delete_secret` cannot delete secret with name %s because it does not exist", name)
        raise GoogleCloudSecretManagerException(
            f"The secret {secret_id} cannot be deleted for project {project_id} because it does not exist",
        )
