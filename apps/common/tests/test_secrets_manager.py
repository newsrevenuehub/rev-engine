import pytest
from google.api_core.exceptions import NotFound, PermissionDenied
from google.cloud.secretmanager import SecretManagerServiceClient

from apps.common.secrets_manager import SecretProviderException, get_secret_manager_client, logger
from apps.organizations.models import GoogleCloudSecretProvider
from revengine.utils import __ensure_gs_credentials


MODEL_ATTR = "some_attr"


@pytest.mark.parametrize("valid", [True, False])
def test_get_secret_manager_client(
    valid,
    settings,
    mocker,
    minimally_valid_google_service_account_credentials,
    invalid_google_service_account_credentials,
):
    settings.GS_CREDENTIALS = __ensure_gs_credentials(
        minimally_valid_google_service_account_credentials if valid else invalid_google_service_account_credentials,
        raise_on_unset=False,
    )
    mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient.__init__", return_value=None)
    client = get_secret_manager_client()
    if valid:
        assert isinstance(client, SecretManagerServiceClient)
    else:
        assert client is None


def make_my_object(secret_provider: GoogleCloudSecretProvider):
    """Create a dummy class with a secret provider, helper function.

    We need to dynamically create MyObject in each test so that we have a chance
    to mock the secret provider's client.
    """

    class MyObject:
        """Just a dummy class to test the secret provider."""

        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        val = secret_provider(MODEL_ATTR, "some-project-id")

    return MyObject


@pytest.mark.django_db
@pytest.mark.usefixtures("_valid_gs_credentials")
class TestGoogleCloudSecretProvider:
    @pytest.mark.parametrize("enabled", [True, False])
    def test_get_happy_path(self, enabled, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = enabled
        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.return_value.payload.data = (val := b"something")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        assert MyObject(**{MODEL_ATTR: "some-secret-name"}).val == (val.decode("utf-8") if enabled else None)

    def test_get_when_not_found(self, settings, mocker):
        logger_spy = mocker.spy(logger, "info")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mocker.patch.object(
            GoogleCloudSecretProvider,
            "get_secret_version_path",
            return_value=(secret_version_path := "secret-version-path"),
        )

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = NotFound("Not found")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        assert MyObject(**{MODEL_ATTR: "something"}).val is None
        assert logger_spy.call_args == mocker.call(
            "GoogleCloudSecretProvider.get_secret did not find secret version for secret %s with path %s",
            secret_name,
            secret_version_path,
        )

    def test_get_when_no_client(self, settings, mocker):
        logger_spy = mocker.spy(logger, "warning")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mock_get_client = mocker.patch("apps.common.secrets_manager.get_secret_manager_client", return_value=None)
        MyObject = make_my_object(GoogleCloudSecretProvider)
        assert MyObject(**{MODEL_ATTR: "something"}).val is None
        mock_get_client.assert_called_once()
        assert logger_spy.call_args == mocker.call(
            "GoogleCloudSecretProvider cannot get secret %s because client is not initialized", secret_name
        )

    def test_get_when_permission_denied(self, settings, mocker):
        logger_spy = mocker.spy(logger, "exception")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mocker.patch.object(
            GoogleCloudSecretProvider,
            "get_secret_version_path",
            return_value=(secret_version_path := "secret-version-path"),
        )

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.access_secret_version.side_effect = PermissionDenied("No way.")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        with pytest.raises(SecretProviderException):
            MyObject(**{MODEL_ATTR: "something"}).val  # noqa: B018 doesn't understand this is a property
            # and accessing it has side effects we are testing.
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider.get_secret cannot access secret version for secret %s with path %s because permission denied",
            secret_name,
            secret_version_path,
        )

    def test_set_when_not_enabled(self, settings, mocker):
        logger_spy = mocker.spy(logger, "warning")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        mock_client.return_value.access_secret_version.assert_not_called()
        my_obj = MyObject(**{MODEL_ATTR: "something"})
        my_obj.val = "some-value"
        mock_client.return_value.get_secret.assert_not_called()
        mock_client.return_value.create_secret.assert_not_called()
        mock_client.return_value.add_secret_version.assert_not_called()
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot set secret %s because not enabled", secret_name
        )

    def test_set_when_no_client(self, settings, mocker):
        logger_spy = mocker.spy(logger, "warning")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mock_client = mocker.patch("apps.common.secrets_manager.get_secret_manager_client", return_value=None)
        MyObject = make_my_object(GoogleCloudSecretProvider)
        my_obj = MyObject(**{MODEL_ATTR: "something"})
        my_obj.val = "some-value"
        mock_client.assert_called_once()
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot get secret %s because client is not initialized", secret_name
        )

    def test_set_when_no_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.get_secret.side_effect = NotFound("Not found")
        mock_client.return_value.create_secret.return_value = "something-truthy"
        mock_client.return_value.add_secret_version = mocker.Mock()
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        instance.val = "some-value"
        mock_client.return_value.get_secret.assert_called_once()
        mock_client.return_value.create_secret.assert_called_once()
        mock_client.return_value.add_secret_version.assert_called_once()

    def test_set_when_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.get_secret.return_value = "somthing-truthy"
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        instance.val = "some-value"
        mock_client.return_value.get_secret.assert_called_once()
        mock_client.return_value.create_secret.assert_not_called()
        mock_client.return_value.add_secret_version.assert_called_once()

    def test_set_when_permission_denied_on_retrieving_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.get_secret.return_value = "somthing-truthy"
        mock_client.return_value.get_secret.side_effect = PermissionDenied("Nah-uh!")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.return_value.get_secret.assert_called_once()
        mock_client.return_value.create_secret.assert_not_called()
        mock_client.return_value.add_secret_version.assert_not_called()

    def test_set_when_permission_denied_on_creating_new_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.get_secret.side_effect = NotFound("unfound")
        mock_client.return_value.create_secret.side_effect = PermissionDenied("Nah-uh!")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.return_value.get_secret.assert_called_once()
        mock_client.return_value.create_secret.assert_called_once()
        mock_client.return_value.add_secret_version.assert_not_called()

    def test_set_when_permission_denied_on_adding_secret_version(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.get_secret.return_value.payload.data = (old_val := b"something")
        mock_client.return_value.add_secret_version.side_effect = PermissionDenied("Nah-uh!")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = old_val.decode("utf-8")[::-1]
        mock_client.return_value.get_secret.assert_called_once()
        mock_client.return_value.add_secret_version.assert_called_once()

    def test_delete_when_not_enabled(self, mocker, settings):
        logger_spy = mocker.spy(logger, "warning")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        mock_client.return_value.delete_secret.assert_not_called()
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot delete secret %s because not enabled",
            secret_name,
        )

    def test_delete_when_no_client(self, mocker, settings):
        logger_spy = mocker.spy(logger, "warning")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mocker.patch("apps.common.secrets_manager.get_secret_manager_client", return_value=None)
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot delete secret %s because client is not initialized", secret_name
        )

    def test_delete_when_enabled(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        mock_client.return_value.delete_secret.assert_called_once()

    def test_delete_when_permission_denied(self, mocker, settings):
        logger_spy = mocker.spy(logger, "exception")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.delete_secret.side_effect = PermissionDenied("Nah-uh!")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        with pytest.raises(SecretProviderException):
            del instance.val
        mock_client.return_value.delete_secret.assert_called_once()
        logger_spy.assert_called_once_with(
            "GoogleCloudSecretProvider cannot delete secret %s because permission denied", secret_name
        )

    def test_delete_when_not_found(self, mocker, settings):
        logger_spy = mocker.spy(logger, "info")
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_name", return_value=(secret_name := "secret-name"))
        mocker.patch.object(GoogleCloudSecretProvider, "get_secret_path", return_value=(secret_path := "secret-path"))

        mock_client = mocker.patch("apps.common.secrets_manager.SecretManagerServiceClient")
        mock_client.return_value.delete_secret.side_effect = NotFound("Not found")
        MyObject = make_my_object(GoogleCloudSecretProvider)
        instance = MyObject(**{MODEL_ATTR: "something"})
        del instance.val
        mock_client.return_value.delete_secret.assert_called_once()
        assert logger_spy.call_args == mocker.call(
            "GoogleCloudSecretProvider couldn't delete secret %s at path %s because not found",
            secret_name,
            secret_path,
        )
