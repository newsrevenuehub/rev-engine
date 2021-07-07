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
        self.slack_manager = SlackManager()
        self.org_channel_name = f"{HUB_ORG_PREFIX}{SlackManager.format_org_name(self.org.name)}"
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            organization=self.org,
            contributor=self.contributor,
            amount=AMOUNT,
            last_payment_date=PAYMENT_DATE,
            interval=INTERVAL,
        )

    def test_slack_integration_calls(self, mock_postmessage):
        self.slack_manager.publish_contribution(self.contribution)
        calls = [
            call(
                channel=HUB_CHANNEL,
                text=self.slack_manager.construct_hub_text(self.contribution),
                blocks=self.slack_manager.construct_hub_blocks(self.contribution),
            ),
            call(
                channel=self.org_channel_name,
                text=self.slack_manager.construct_org_text(self.contribution),
                blocks=self.slack_manager.construct_org_blocks(self.contribution),
            ),
            call(
                channel=ORG_CHANNEL,
                text=self.slack_manager.construct_org_text(self.contribution),
                blocks=self.slack_manager.construct_org_blocks(self.contribution),
            ),
        ]
        mock_postmessage.assert_has_calls(calls=calls, any_order=True)
