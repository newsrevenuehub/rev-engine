from unittest.mock import Mock

import pytest
from google.api_core.exceptions import NotFound, PermissionDenied

from apps.common.secrets import SecretProviderException
from apps.organizations.models import GoogleCloudSecretProvider


@pytest.mark.django_db
class TestGoogleCloudSecretProvider:
    @pytest.mark.parametrize("enabled", [True, False])
    def test_happy_path(self, enabled, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = enabled
        model_attr = "my_attr"
        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.return_value.payload.data = (val := b"something")

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        assert MyObject(**{model_attr: "some-secret-name"}).val == (val.decode("utf-8") if enabled else None)

    def test_when_not_found(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.side_effect = NotFound("Not found")
        assert MyObject(**{model_attr: "something"}).val is None

    def test_when_permission_denied(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.access_secret_version.side_effect = PermissionDenied("Permission denied")
        with pytest.raises(SecretProviderException):
            MyObject(**{model_attr: "something"}).val

    def test_setting_value_when_not_enabled(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        assert MyObject(**{model_attr: "something"}).val is None
        mock_client.get_secret.assert_not_called()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_no_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_client.get_secret.side_effect = NotFound("Not found")
        mock_client.create_secret.return_value = "something-truthy"
        mock_client.add_secret_version = Mock()
        instance = MyObject(**{model_attr: "something"})
        instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_called_once()
        mock_client.add_secret_version.assert_called_once()

    def test_setting_value_when_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.return_value = "something-truthy"
        instance = MyObject(**{model_attr: "something"})
        instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_called_once()

    def test_setting_value_when_permission_denied_on_retrieving_previous_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{model_attr: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_not_called()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_permission_denied_on_creating_new_secret(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.side_effect = NotFound("unfound")
        mock_client.create_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{model_attr: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = "some-value"
        mock_client.get_secret.assert_called_once()
        mock_client.create_secret.assert_called_once()
        mock_client.add_secret_version.assert_not_called()

    def test_setting_value_when_permission_denied_on_adding_secret_version(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.get_secret.return_value.payload.data = (old_val := b"something")
        mock_client.add_secret_version.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{model_attr: "something"})
        with pytest.raises(SecretProviderException):
            instance.val = old_val.decode("utf-8")[::-1]
        mock_client.get_secret.assert_called_once()
        mock_client.add_secret_version.assert_called_once()

    def test_deleting_value_when_not_enabled(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        instance = MyObject(**{model_attr: "something"})
        assert instance.val is None
        mock_client.delete_secret.assert_not_called()

    def test_deleting_value_when_enabled(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        instance = MyObject(**{model_attr: "something"})
        del instance.val
        mock_client.delete_secret.assert_called_once()

    def test_deleting_value_when_permission_denied(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.delete_secret.side_effect = PermissionDenied("Nah-uh!")
        instance = MyObject(**{model_attr: "something"})
        with pytest.raises(SecretProviderException):
            del instance.val
        mock_client.delete_secret.assert_called_once()

    def test_deleting_value_when_not_found(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        model_attr = "my_attr"

        class MyObject:
            """Just a dummy class to test the secret provider"""

            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

            val = GoogleCloudSecretProvider(model_attr, "some-project-id")

        mock_client = mocker.patch.object(GoogleCloudSecretProvider, "client", autospec=True)
        mock_client.delete_secret.side_effect = NotFound("Not found")
        instance = MyObject(**{model_attr: "something"})
        del instance.val
        mock_client.delete_secret.assert_called_once()
