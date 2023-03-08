from unittest.mock import Mock

import pytest

from apps.organizations.models import RevenueProgram
from apps.organizations.signals import delete_rp_mailchimp_access_token_secret


@pytest.mark.django_db
class TestRevenueProgramDeletedhandler:
    def test_when_mailchimp_access_token_secret(self, revenue_program, settings, monkeypatch, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_secret = Mock(payload=Mock(data=b"something"))
        monkeypatch.setattr("apps.organizations.models.get_secret_version", lambda *args, **kwargs: mock_secret)
        mock_delete_secret = mocker.patch("apps.organizations.signals.delete_secret")
        delete_rp_mailchimp_access_token_secret(RevenueProgram, revenue_program)
        mock_delete_secret.assert_called_once_with(
            project_id=settings.GOOGLE_CLOUD_PROJECT, secret_id=revenue_program.mailchimp_access_token_secret_name
        )
