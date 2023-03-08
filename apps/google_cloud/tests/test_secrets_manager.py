from dataclasses import dataclass

import pytest
from google.api_core.exceptions import AlreadyExists, NotFound, PermissionDenied

from apps.google_cloud.secrets_manager import (
    GoogleCloudSecretManagerException,
    create_secret,
    create_secret_version,
    delete_secret,
    get_secret_version,
    logger,
)


class TestGetSecretVersion:
    kwargs = {"secret_id": "my_big_secret", "version_id": "latest", "project_id": "test-project"}

    def test_happy_path(self, mocker):
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        value = "test"
        mock_client.return_value.access_secret_version.return_value.payload.data = value.encode("utf-8")
        assert get_secret_version(**self.kwargs).payload.data == value.encode("utf-8")
        mock_client.return_value.access_secret_version.assert_called_once_with(
            request={
                "name": f"projects/{self.kwargs['project_id']}/secrets/{self.kwargs['secret_id']}/versions/{self.kwargs['version_id']}"
            }
        )

    def test_when_not_found(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = NotFound("Not found")
        with pytest.raises(GoogleCloudSecretManagerException):
            get_secret_version(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`get_secret` cannot find a secret with secret_id %s in project %s",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )

    def test_when_permission_denied(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(GoogleCloudSecretManagerException):
            get_secret_version(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`get_secret` cannot access secret %s",
            f"projects/{self.kwargs['project_id']}/secrets/{self.kwargs['secret_id']}/versions/{self.kwargs['version_id']}",
        )


class TestCreateSecret:
    kwargs = {"secret_id": "my_big_secret", "project_id": "test-project"}

    def test_happy_path(self, mocker):
        @dataclass
        class MockReturnValue:
            name: str = "some-name"
            foo: str = "bar"

        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.create_secret.return_value = (return_value := MockReturnValue())
        mock_client.return_value.secret_path.return_value = (
            f"projects/{self.kwargs['project_id']}/secrets/{self.kwargs['secret_id']}"
        )
        assert create_secret(**self.kwargs) == return_value
        mock_client.return_value.create_secret.assert_called_once_with(
            request={
                "parent": mock_client.return_value.secret_path.return_value,
                "secret_id": self.kwargs["secret_id"],
            }
        )

    def test_when_permission_denied(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.create_secret.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(GoogleCloudSecretManagerException):
            create_secret(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`create_secret` cannot create a secret with secret_id %s because project %s is not permitted",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )

    def test_when_already_exists(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.create_secret.side_effect = AlreadyExists("Already exists")
        with pytest.raises(GoogleCloudSecretManagerException):
            create_secret(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`create_secret` cannot create a secret with secret_id %s because one already exists for project %s",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )


class TestCreateSecretVersion:
    kwargs = {"secret_id": "my_big_secret", "project_id": "test-project", "payload": "shhhhhh!"}

    def test_happy_path(self, mocker):
        @dataclass
        class MockReturnValue:
            name: str = "some-name"
            foo: str = "bar"

        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.add_secret_version.return_value = (return_value := MockReturnValue())
        mock_client.return_value.secret_path.return_value = (
            f"projects/{self.kwargs['project_id']}/secrets/{self.kwargs['secret_id']}"
        )
        assert create_secret_version(**self.kwargs) == return_value
        mock_client.return_value.add_secret_version.assert_called_once_with(
            request={
                "parent": mock_client.return_value.secret_path.return_value,
                "payload": {"data": self.kwargs["payload"].encode("utf-8")},
            }
        )

    def test_when_permission_denied(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.add_secret_version.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(GoogleCloudSecretManagerException):
            create_secret_version(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`create_secret_version` cannot create a secret version for secret_id %s because project %s is not permitted",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )

    def test_when_not_found(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.add_secret_version.side_effect = NotFound("Not found")
        with pytest.raises(GoogleCloudSecretManagerException):
            create_secret_version(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`create_secret_version` cannot create a secret version for secret_id %s because it does not exist in project %s",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )


class TestDeleteSecret:
    kwargs = {"secret_id": "my_big_secret", "project_id": "test-project"}

    def test_happy_path(self, mocker):
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.secret_path.return_value = "some-path"
        mock_client.return_value.delete_secret.return_value = None
        delete_secret(**self.kwargs)
        mock_client.return_value.delete_secret.assert_called_once_with(
            request={"name": mock_client.return_value.secret_path.return_value}
        )

    def test_when_permission_denied(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.secret_path.return_value = "something"
        mock_client.return_value.delete_secret.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(GoogleCloudSecretManagerException):
            delete_secret(**self.kwargs)
        mock_client.return_value.delete_secret.assert_called_once_with(
            request={"name": mock_client.return_value.secret_path.return_value}
        )
        logger_spy.assert_called_once_with(
            "`delete_secret` cannot delete secret with name %s because project %s is not permitted",
            mock_client.return_value.secret_path.return_value,
            self.kwargs["project_id"],
        )

    def test_when_not_found(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.google_cloud.secrets_manager.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.secret_path.return_value = (secret_path := "something")
        mock_client.return_value.delete_secret.side_effect = NotFound("Not found")
        with pytest.raises(GoogleCloudSecretManagerException):
            delete_secret(**self.kwargs)
        logger_spy.assert_called_once_with(
            "`delete_secret` cannot delete secret with name %s because it does not exist", secret_path
        )
