from unittest.mock import Mock, patch
from urllib.parse import urljoin

from django.core.management import call_command
from django.test import TestCase, override_settings

import pytest
from rest_framework.reverse import reverse

from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
def test_bootstrap_review_app_bootstraps_hookdeck(monkeypatch):
    ticket_id = "DEV-9999"
    heroku_branch_name = f"{ticket_id}-foo-barrr"
    heroku_app_name = "rev-engine-dev-9999-some-uid"
    cf_zone_name = "some-domain.org"
    monkeypatch.setenv("HEROKU_BRANCH", heroku_branch_name)
    monkeypatch.setenv("HEROKU_APP_NAME", heroku_app_name)
    monkeypatch.setenv("CF_ZONE_NAME", cf_zone_name)

    for x in range(3):
        RevenueProgramFactory()

    class HerokuApp:
        domains = lambda *args, **kwargs: []
        add_domain = lambda *args, **kwargs: Mock()
        config = lambda *args, **kwargs: Mock()

    class MockConn:
        def apps(self):
            return {heroku_app_name: HerokuApp()}

    mock_from_key = Mock(return_value=MockConn())
    monkeypatch.setattr("heroku3.from_key", mock_from_key)

    monkeypatch.setattr("apps.common.utils.upsert_cloudflare_cnames", Mock())
    mock_bootstrap_hookdeck = Mock()
    monkeypatch.setattr("apps.common.hookdeck.bootstrap", mock_bootstrap_hookdeck)
    call_command("bootstrap-review-app")

    expected_url = urljoin(f"https://{ticket_id.lower()}.{cf_zone_name}", reverse("stripe-webhooks"))
    mock_bootstrap_hookdeck.assert_called_once_with(ticket_id.lower(), expected_url)


# NB, for some reason couldn't get this test to work as a pytest test not using `TestCase`.
# Specifically, `settings.HEROKU_BRANCH` had `None` value even when using `monkeypatch.setenv`.
@override_settings(HEROKU_BRANCH="DEV-9999--foo-barrr")
@override_settings(HEROKU_APP_NAME="rev-engine-dev-9999-some-uid")
class TestTearDownReviewAppCommand(TestCase):
    @patch("apps.common.hookdeck.tear_down")
    @patch("apps.common.utils.delete_cloudflare_cnames")
    def test_tears_down_hookdeck(self, mock_cloudflare, mock_teardown_hookdeck):
        call_command("teardown-review-app")
        mock_teardown_hookdeck.assert_called_once_with("dev-9999")
