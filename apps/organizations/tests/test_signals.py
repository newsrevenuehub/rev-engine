from unittest.mock import Mock

import pytest

from apps.organizations.models import GoogleCloudSecretProvider, RevenueProgram
from apps.organizations.signals import delete_rp_mailchimp_access_token_secret
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestRevenueProgramDeletedhandler:
    def test_when_mailchimp_access_token_secret(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_secret = Mock(payload=Mock(data=b"something"))
        mock_provider = mocker.patch.object(GoogleCloudSecretProvider, "client")
        mock_provider.access_secret_version.return_value = mock_secret
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix="us1")
        delete_rp_mailchimp_access_token_secret(RevenueProgram, revenue_program)
        mock_provider.delete_secret.assert_called_once_with(
            request={
                "name": f"projects/{settings.GOOGLE_CLOUD_PROJECT}/secrets/{revenue_program.mailchimp_access_token_secret_name}"
            }
        )
