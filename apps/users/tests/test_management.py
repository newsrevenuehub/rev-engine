from urllib.parse import urljoin

from django.core.management import call_command

import pytest
from rest_framework.reverse import reverse

from apps.organizations.tests.factories import RevenueProgramFactory


MOCK_TICKET_ID = "DEV-9999"
MOCK_HEROKU_APP_NAME = f"rev-engine-{MOCK_TICKET_ID.lower()}-some-uid"
MOCK_CF_ZONE_NAME = "some-domain.org"


class TestBootstrapReviewApp:
    """Test that bootstrap review app calls different functions as expected."""

    def test_happy_path(self, mocker):
        mocker.patch("heroku3.from_key", return_value=mocker.MagicMock())
        mocker.patch("apps.common.utils.upsert_cloudflare_cnames", return_value=mocker.Mock())
        RevenueProgramFactory.create_batch(size=3)
        with mocker.patch("apps.common.hookdeck.bootstrap", return_value=None) as mock_bootstrap_hookdeck:
            call_command("bootstrap-review-app")
            mock_bootstrap_hookdeck.assert_called_once_with(
                MOCK_TICKET_ID.lower(),
                urljoin(
                    f"https://{MOCK_TICKET_ID.lower()}.{MOCK_CF_ZONE_NAME}", reverse("stripe-webhooks-contributions")
                ),
                urljoin(
                    f"https://{MOCK_TICKET_ID.lower()}.{MOCK_CF_ZONE_NAME}",
                    reverse("organization-handle-stripe-webhook"),
                ),
            )


class TestTearDownReviewAppCommand:

    @pytest.fixture(autouse=True)
    def _settings(self, settings):
        settings.HEROKU_BRANCH = "DEV-9999--foo-barrr"
        settings.HEROKU_APP_NAME = "rev-engine-dev-9999-some-uid"

    def test_tears_down_hookdeck(self, mocker):
        mock_teardown = mocker.patch("apps.common.hookdeck.tear_down")
        mocker.patch("apps.common.utils.delete_cloudflare_cnames")
        call_command("teardown-review-app")
        mock_teardown.assert_called_once_with("dev-9999")
