import os
from urllib.parse import urljoin

from django.core.management import call_command

import pytest
import pytest_mock
from rest_framework.reverse import reverse

from apps.organizations.tests.factories import RevenueProgramFactory


MOCK_TICKET_ID = "DEV-9999"
MOCK_HEROKU_APP_NAME = f"rev-engine-{MOCK_TICKET_ID.lower()}-some-uid"
MOCK_CF_ZONE_NAME = "some-domain.org"


@pytest.mark.django_db
class TestBootstrapReviewApp:
    """Test that bootstrap review app calls different functions as expected."""

    def test_happy_path(self, mocker, settings):
        settings.HEROKU_BRANCH = MOCK_TICKET_ID
        settings.CF_ZONE_NAME = MOCK_CF_ZONE_NAME
        mocker.patch("heroku3.from_key", return_value=mocker.MagicMock())
        mocker.patch("apps.common.utils.upsert_cloudflare_cnames", return_value=mocker.Mock())
        mock_hookdeck_bootstrap = mocker.patch("apps.common.hookdeck.bootstrap", return_value=None)
        RevenueProgramFactory.create_batch(size=3)
        call_command("bootstrap-review-app")
        mock_hookdeck_bootstrap.assert_called_once_with(
            MOCK_TICKET_ID.lower(),
            urljoin(f"https://{MOCK_TICKET_ID.lower()}.{MOCK_CF_ZONE_NAME}", reverse("stripe-webhooks-contributions")),
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

    @pytest.fixture
    def env_with_sentry_settings(self, mocker: pytest_mock.MockerFixture):
        mocker.patch.object(
            os,
            "environ",
            {
                "SENTRY_ORGANIZATION_SLUG": "test_organization_slug",
                "SENTRY_PROJECT_SLUG": "test_project_slug",
                "SENTRY_AUTH_TOKEN": "test_auth_token",
            },
        )

    def test_tears_down_hookdeck(self, mocker):
        mock_teardown = mocker.patch("apps.common.hookdeck.tear_down")
        mocker.patch("apps.common.utils.delete_cloudflare_cnames")
        call_command("teardown-review-app")
        mock_teardown.assert_called_once_with("dev-9999")

    @pytest.mark.usefixtures("env_with_sentry_settings")
    def test_hides_sentry_if_env_variables_set(self, mocker):
        # Patching where it's imported because otherwise the mock is in the
        # wrong place and isn't called by the management command.
        mock_sentry_hide_environment = mocker.patch(
            "apps.users.management.commands.teardown-review-app.hide_sentry_environment"
        )
        mocker.patch("apps.common.utils.delete_cloudflare_cnames")
        mocker.patch("apps.common.hookdeck.tear_down")
        call_command("teardown-review-app")
        mock_sentry_hide_environment.assert_called_once_with(
            ticket_id="dev-9999",
            org_slug="test_organization_slug",
            project_slug="test_project_slug",
            auth_token="test_auth_token",
        )

    @pytest.mark.usefixtures("env_with_sentry_settings")
    @pytest.mark.parametrize(
        "missing_env_variable", ["SENTRY_ORGANIZATION_SLUG", "SENTRY_PROJECT_SLUG", "SENTRY_AUTH_TOKEN"]
    )
    def test_doesnt_hide_sentry_if_env_variable_unset(self, missing_env_variable, mocker):
        mocker.patch.object(os, "environ", {k: os.environ[k] for k in os.environ.keys() - {missing_env_variable}})
        # Patching where it's imported because otherwise the mock is in the
        # wrong place and isn't called by the management command.
        mock_sentry_hide_environment = mocker.patch(
            "apps.users.management.commands.teardown-review-app.hide_sentry_environment"
        )
        mocker.patch("apps.common.utils.delete_cloudflare_cnames")
        mocker.patch("apps.common.hookdeck.tear_down")
        call_command("teardown-review-app")
        assert not mock_sentry_hide_environment.called
