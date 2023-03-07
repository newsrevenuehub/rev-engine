from dataclasses import dataclass

import pytest
from google.api_core.exceptions import NotFound, PermissionDenied

from apps.common.google_cloud_secrets import (
    GoogleCloudSecretManagerException,
    create_secret,
    get_secret_version,
    logger,
)


class TestGetSecretVersion:
    kwargs = {"secret_id": "my_big_secret", "version_id": "latest", "project_id": "test-project"}

    def test_happy_path(self, mocker):
        mock_client = mocker.patch("apps.common.google_cloud_secrets.secretmanager.SecretManagerServiceClient")
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
        mock_client = mocker.patch("apps.common.google_cloud_secrets.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = NotFound("Not found")
        with pytest.raises(GoogleCloudSecretManagerException):
            assert get_secret_version(**self.kwargs) is None
        logger_spy.assert_called_once_with(
            "`get_secret` cannot find a secret with secret_id %s in project %s",
            self.kwargs["secret_id"],
            self.kwargs["project_id"],
        )

    def test_when_permission_denied(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mock_client = mocker.patch("apps.common.google_cloud_secrets.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(GoogleCloudSecretManagerException):
            assert get_secret_version(**self.kwargs) is None
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

        mock_client = mocker.patch("apps.common.google_cloud_secrets.secretmanager.SecretManagerServiceClient")
        mock_client.return_value.create_secret.return_value.name = (return_value := MockReturnValue())
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

    # def test_when_permission_denied(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")

    # def test_when_secret_not_found(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")


class TestCreateSecretVersion:
    kwargs = {"secret_id": "my_big_secret", "project_id": "test-project", "payload": {"shhhhhh!"}}

    def test_happy_path(self, mocker):
        pass

    # def test_when_permission_denied(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")

    # def test_when_already_exists(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")


class TestDeleteSecret:
    def test_happy_path(self, mocker):
        pass

    # def test_when_permission_denied(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")

    # def test_when_not_found(self, mocker):
    #     logger_spy = mocker.spy(logger, "warning")
