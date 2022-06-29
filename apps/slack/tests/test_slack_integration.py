from unittest import mock
from unittest.mock import call, patch

from django.test import TestCase
from django.utils import timezone

from slack_sdk.errors import SlackApiError

from apps.contributions.models import ContributionInterval
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory
from apps.slack.models import HubSlackIntegration, OrganizationSlackIntegration, format_channel_name
from apps.slack.slack_manager import SlackManager


HUB_TOKEN = "token-123"
HUB_CHANNEL = "#donations-all"
HUB_ORG_PREFIX = "#donations-"

ORG_CHANNEL = "#org-contributions"
ORG_TOKEN = "org-token-123"

AMOUNT = 1000
PAYMENT_DATE = timezone.now()
INTERVAL = ContributionInterval.ONE_TIME


@patch("apps.slack.slack_manager.WebClient.chat_postMessage")
class SlackIntegrationTest(TestCase):
    def setUp(self):
        self.hub_integration = HubSlackIntegration.get_solo()
        self.hub_integration.bot_token = HUB_TOKEN
        self.hub_integration.channel = HUB_CHANNEL
        self.hub_integration.org_channel_prefix = HUB_ORG_PREFIX
        self.hub_integration.save()
        self.org = OrganizationFactory()
        self.org_channel = "org-contributions"
        self.org_integration = OrganizationSlackIntegration(
            organization=self.org, channel=ORG_CHANNEL, bot_token=ORG_TOKEN
        )
        self.org_channel_name = f"{HUB_ORG_PREFIX}{SlackManager.format_org_name(self.org.name)}"
        self.contributor = ContributorFactory()

        self.contribution = ContributionFactory(
            contributor=self.contributor,
            amount=AMOUNT,
            donation_page=DonationPageFactory(revenue_program=RevenueProgramFactory(organization=self.org)),
            last_payment_date=PAYMENT_DATE,
            interval=INTERVAL,
        )

    def _create_slack_manager(self):
        return SlackManager()

    def test_slack_integration_calls(self, mock_postmessage):
        slack_manager = self._create_slack_manager()
        slack_manager.publish_contribution(self.contribution)
        calls = [
            call(
                channel=HUB_CHANNEL,
                text=slack_manager.construct_hub_text(self.contribution),
                blocks=slack_manager.construct_hub_blocks(self.contribution),
            ),
            call(
                channel=self.org_channel_name,
                text=slack_manager.construct_org_text(self.contribution),
                blocks=slack_manager.construct_org_blocks(self.contribution),
            ),
            call(
                channel=ORG_CHANNEL,
                text=slack_manager.construct_org_text(self.contribution),
                blocks=slack_manager.construct_org_blocks(self.contribution),
            ),
        ]
        mock_postmessage.assert_has_calls(calls=calls, any_order=True)

    @patch("apps.slack.slack_manager.logger")
    def test_logging_when_bad_api_key(self, mock_logger, mock_postmessage):
        mock_postmessage.side_effect = SlackApiError("my_slack_error", {"error": "invalid_auth"})

        slack_manager = self._create_slack_manager()
        slack_manager.publish_contribution(self.contribution)

        # Org slack errors are warnings
        mock_logger.warning.assert_called()
        warning_args = mock_logger.warning.call_args[0]
        self.assertIn(self.org.name, warning_args)
        self.assertNotIn("HubSlackIntegration", warning_args)
        self.assertIn("invalid token", warning_args[0])

        # Hub slack errors are exceptions
        mock_logger.exception.assert_called()
        error_args = mock_logger.exception.call_args[0][0]
        self.assertIn("HubSlackIntegration", error_args)
        self.assertIn("invalid token", error_args)

    @patch("apps.slack.slack_manager.logger")
    def test_logging_when_bad_channel_name(self, mock_logger, mock_postmessage):
        mock_postmessage.side_effect = SlackApiError("my_slack_error", {"error": "channel_not_found"})

        slack_manager = self._create_slack_manager()
        slack_manager.publish_contribution(self.contribution)

        # Org slack errors are warnings
        mock_logger.warning.assert_called()

        self.assertNotIn("HubSlackIntegration", mock_logger.warning.call_args[0][0])
        self.assertIn("No such channel", mock_logger.warning.call_args[0][0])
        self.assertEqual(mock_logger.warning.call_args[0][1], ORG_CHANNEL)
        self.assertEqual(mock_logger.warning.call_args[0][2], self.org.name)

        # Hub slack errors are exceptions
        mock_logger.exception.assert_called()
        error_args = mock_logger.exception.call_args[0]
        self.assertIn("HubSlackIntegration", error_args[0])
        self.assertIn("No such channel", error_args[0])
        self.assertEqual(self.org_channel_name, error_args[1])

    @patch("apps.slack.slack_manager.logger.warning")
    def test_log_info_when_generic_slack_error(self, mock_warn, mock_postmessage):
        error_message = "some_other_error"
        mock_postmessage.side_effect = SlackApiError("my_slack_error", {"error": error_message})

        slack_manager = self._create_slack_manager()
        slack_manager.publish_contribution(self.contribution)

        # 2 Hub warnings first...
        self.assertIn("Generic SlackApiError", mock_warn.call_args_list[0].args[0])
        self.assertIn(error_message, mock_warn.call_args_list[0].args[1]["error"])

        # ... then an org warning.
        org_warning = mock_warn.call_args_list[2]
        org_warning = org_warning.args[0]
        self.assertIn("Generic SlackApiError for Org", mock_warn.call_args_list[2].args[0])
        self.assertEqual(self.org.name, mock_warn.call_args_list[2].args[1])
        self.assertIn(error_message, mock_warn.call_args_list[2].args[3]["error"])

    @patch("apps.slack.slack_manager.logger.info")
    def test_log_info_when_no_integration(self, mock_info_logger, mock_postmessage):
        """
        Log an info level log when an org is missing a slack integration.
        """
        # Remove existing hub SlackIntegration
        HubSlackIntegration.objects.first().delete()
        # Remove existing org SlackIntegrations
        self.org_integration.delete()
        # instantiating slack_manager will trigger info log
        self._create_slack_manager()
        mock_info_logger.assert_called_once_with(
            "Tried to send slack notification, but News Revenue Engine does not have a SlackIntegration configured"
        )
        mock_postmessage.assert_not_called()

    def test_format_channel_name(self, *args):
        """
        format_channel_name should ensure that a whatever string it is passed turns in to a valid Slack Channel name
        """
        # Missing hash should be added
        self.assertEqual(format_channel_name("testing")[0], "#")
        # Should not add additional hash if already present
        self.assertNotIn(format_channel_name("#testing-channel"), "##")
