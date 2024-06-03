from unittest.mock import Mock, patch
from urllib.parse import urljoin

from django.core.management import call_command
from django.test import TestCase, override_settings

from rest_framework.reverse import reverse

from apps.organizations.tests.factories import RevenueProgramFactory


MOCK_TICKET_ID = "DEV-9999"
MOCK_HEROKU_APP_NAME = f"rev-engine-{MOCK_TICKET_ID.lower()}-some-uid"
MOCK_CF_ZONE_NAME = "some-domain.org"


class _MockHerokuApp:
    domains = lambda *args, **kwargs: []
    add_domain = lambda *args, **kwargs: Mock()
    config = lambda *args, **kwargs: Mock()


class TestBootstrapReviewApp(TestCase):
    """Test that bootstrap review app calls different functions as expected.

    # NB, in general we're trying to avoid `TestCase` and only do pytest-based tests.
    # However, in this case, I had trouble getting settings vars to have expected
    # value using `monkeypatch.setenv`. This seems related to the following answer from
    # SO where the author explains intricacies of execution order of `setenv`:
    # https://stackoverflow.com/a/73579245
    """

    class MockConn:
        def apps(self):
            return {MOCK_HEROKU_APP_NAME: _MockHerokuApp()}

    @patch("heroku3.from_key", return_value=MockConn())
    @patch("apps.common.utils.upsert_cloudflare_cnames", return_value=Mock())
    @override_settings(HEROKU_BRANCH="DEV-9999--foo-barrr")
    @override_settings(HEROKU_APP_NAME="rev-engine-dev-9999-some-uid")
    @override_settings(CF_ZONE_NAME="some-domain.org")
    def test_happy_path(self, mock_from_key, mock_upsert_cloudflare):
        RevenueProgramFactory.create_batch(size=3)
        with patch("apps.common.hookdeck.bootstrap", return_value=None) as mock_bootstrap_hookdeck:
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


@override_settings(HEROKU_BRANCH="DEV-9999--foo-barrr")
@override_settings(HEROKU_APP_NAME="rev-engine-dev-9999-some-uid")
class TestTearDownReviewAppCommand(TestCase):
    # NB, in general we're trying to avoid `TestCase` and only do pytest-based tests.
    # However, in this case, I had trouble getting settings vars to have expected
    # value using `monkeypatch.setenv`. This seems related to the following answer from
    # SO where the author explains intricacies of execution order of `setenv`:
    # https://stackoverflow.com/a/73579245
    @patch("apps.common.hookdeck.tear_down")
    @patch("apps.common.utils.delete_cloudflare_cnames")
    def test_tears_down_hookdeck(self, mock_cloudflare, mock_teardown_hookdeck):
        call_command("teardown-review-app")
        mock_teardown_hookdeck.assert_called_once_with("dev-9999")
