from unittest.mock import Mock

import pytest
from google.api_core.exceptions import NotFound, PermissionDenied

from apps.common.secrets import SecretProviderException, logger
from apps.organizations.models import GoogleCloudSecretProvider


MODEL_ATTR = "some_attr"


class MyObject:
    """Just a dummy class to test the secret provider"""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    val = GoogleCloudSecretProvider(MODEL_ATTR, "some-project-id")


@pytest.mark.django_db
class TestGoogleCloudSecretProvider:
    @pytest.mark.parametrize("enabled", [True, False])
    def test_happy_path(self, enabled, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = enabled
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.return_value.payload.data = (val := b"something")
        assert MyObject(**{MODEL_ATTR: "some-secret-name"}).val == (val.decode("utf-8") if enabled else None)

    def test_when_not_found(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.side_effect = NotFound("Not found")
        assert MyObject(**{MODEL_ATTR: "something"}).val is None

    def test_get_when_no_client(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "client", None)
        assert MyObject(**{MODEL_ATTR: "something"}).val is None

    def test_when_permission_denied(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(SecretProviderException):
            MyObject(**{MODEL_ATTR: "something"}).val

    def test_setting_value_when_not_enabled(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        assert MyObject(**{MODEL_ATTR: "something"}).val is None
        mock_client.get_secret.assert_not_called()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_no_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.get_secret.side_effect = NotFound("Not found")
        mock_client.create_secret.return_value = "something-truthy"
        mock_client.add_secret_version = Mock()
        instance = MyObject(**{MODEL_ATTR: "something"})
        instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_called_once()
        mock_client.add_secret_version.assert_called_once()

    def test_setting_value_when_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.return_value = "something-truthy"
        instance = MyObject(**{MODEL_ATTR: "something"})
        instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_called_once()

    def test_setting_value_when_permission_denied_on_retrieving_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_permission_denied_on_creating_new_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.side_effect = NotFound("unfound")
        mock_client.create_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_called_once()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_permission_denied_on_adding_secret_version(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.return_value.payload.data = (old_val := b"something")
        mock_client.add_secret_version.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = old_val.decode("utf-8")[::-1]
        mock_client.get_secret.assert_called_once()
        mock_client.add_secret_version.assert_called_once()

    def test_set_when_no_client(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        instance = MyObject(**{MODEL_ATTR: (name := "something")})
        debug_spy = mocker.spy(logger, "debug")
        mocker.patch.object(GoogleCloudSecretProvider, "client", None)
        instance.val = "some-value"
        debug_spy.assert_called_once_with(
            "GoogleCloudSecretProvider.__set__ cannot set secret value for secret %s. Returning early", name
        )

    def test_deleting_value_when_not_enabled(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        instance = MyObject(**{MODEL_ATTR: "something"})
        assert instance.val is None
        mock_client.delete_secret.assert_not_called()

    def test_deleting_value_when_enabled(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        mock_client.delete_secret.assert_called_once()

    def test_deleting_value_when_permission_denied(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.delete_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            del instance.val
        mock_client.delete_secret.assert_called_once()

    def test_deleting_value_when_not_found(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.delete_secret.side_effect = NotFound("Not found")
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        mock_client.delete_secret.assert_called_once()

    def test_delete_when_no_client(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        instance = MyObject(**{MODEL_ATTR: (name := "something")})
        info_spy = mocker.spy(logger, "info")
        mocker.patch.object(GoogleCloudSecretProvider, "client", None)
        del instance.val
        info_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot delete secret %s on GC because client is None", name
        )
