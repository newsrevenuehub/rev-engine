from unittest.mock import call, patch

from django.test import TestCase
from django.utils import timezone

from apps.contributions.models import ContributionInterval
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory
from apps.slack.models import HubSlackIntegration, OrganizationSlackIntegration
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
            organization=self.org,
            contributor=self.contributor,
            amount=AMOUNT,
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
            "Tried to send slack notification, but News Revenue Hub does not have a SlackIntegration configured"
        )
        mock_postmessage.assert_not_called()
