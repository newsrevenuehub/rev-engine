import pytest

from apps.organizations.models import RevenueProgram
from apps.organizations.signals import delete_rp_mailchimp_access_token_secret
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestRevenueProgramDeletedhandler:
    def test_when_mailchimp_access_token(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        settings.GOOGLE_CLOUD_PROJECT_ID = "some-id"
        mock_get_client = mocker.patch("apps.common.secrets.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = (token := b"token-val")
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix="us1")
        assert revenue_program.mailchimp_access_token == token.decode("UTF-8")
        delete_rp_mailchimp_access_token_secret(RevenueProgram, revenue_program)
        mock_get_client.return_value.delete_secret.assert_called_once_with(
            request={
                "name": f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}/secrets/{revenue_program.mailchimp_access_token_secret_name}"
            }
        )
