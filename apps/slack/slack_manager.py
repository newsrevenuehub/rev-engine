import logging

from django.conf import settings

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from apps.organizations.models import Organization

# from slack_sdk.errors import SlackApiError
from apps.slack.models import HubSlackIntegration


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class SlackManagerError(Exception):
    pass


class SlackManager:
    common_header_text = "New RevEngine Contribution Received!"
    hub_integration = None
    org_integration = None

    def __init__(self):
        self.hub_integration = self.get_hub_integration()
        self.hub_client = self.get_hub_client()

    def get_hub_integration(self):
        try:
            return HubSlackIntegration.objects.get()
        except HubSlackIntegration.DoesNotExist:
            logger.info(
                "Tried to send slack notification, but News Revenue Engine does not have a SlackIntegration configured"
            )

    def get_hub_client(self):
        if self.hub_integration:
            return WebClient(token=self.hub_integration.bot_token)

    def get_org_client(self):
        return WebClient(token=self.org_integration.bot_token)

    def get_org_integration(self, org):
        try:
            return org.slack_integration
        except Organization.slack_integration.RelatedObjectDoesNotExist:
            logger.info(
                "Tried to send slack notification, but %s does not have a SlackIntegration configured", org.name
            )

    @classmethod
    def format_org_name(cls, org_name):
        return org_name.strip().replace(" ", "-").lower()

    def get_org_channel(self, org):
        return f"{self.hub_integration.org_channel_prefix}{self.format_org_name(org.name)}"

    def construct_common_header_block(self):
        return {"type": "header", "text": {"type": "plain_text", "text": self.common_header_text}}

    def construct_common_body_block(self, contribution):
        return {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Contributor:*\n{contribution.contributor.email}"},
                {"type": "mrkdwn", "text": f"*Type:*\n{contribution.get_interval_display()}"},
                {"type": "mrkdwn", "text": f"*Amount:*\n{contribution.formatted_amount}"},
            ],
        }

    def construct_common_dates_block(self, contribution):
        return {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Contribution date:*\n{contribution.last_payment_date.strftime('%Y-%m-%d %H:%M:%S')}",
                }
            ],
        }

    def construct_common_link_block(self, contribution):
        return {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"<{settings.SITE_URL}/dashboard/contributions?id={contribution.pk}|View on RevEngine>",
            },
        }

    def construct_hub_blocks(self, contribution):
        header = self.construct_common_header_block()
        body = self.construct_common_body_block(contribution)
        dates = self.construct_common_dates_block(contribution)
        links = self.construct_common_link_block(contribution)

        org_field = {"type": "mrkdwn", "text": f"*Organization:*\n{contribution.revenue_program.organization.name}"}
        body["fields"].insert(0, org_field)

        return [header, body, dates, links]

    def construct_hub_text(self, contribution):
        return f"{self.common_header_text}: {contribution.formatted_amount} for {contribution.revenue_program.organization.name} from {contribution.contributor.email}"

    def construct_org_blocks(self, contribution):
        header = self.construct_common_header_block()
        body = self.construct_common_body_block(contribution)
        dates = self.construct_common_dates_block(contribution)
        links = self.construct_common_link_block(contribution)
        return [header, body, dates, links]

    def construct_org_text(self, contribution):
        return f"{self.common_header_text}: {contribution.formatted_amount} from {contribution.contributor.email}"

    def send_hub_message(self, channel, text, blocks):
        try:
            self.hub_client.chat_postMessage(channel=channel, text=text, blocks=blocks)
        except SlackApiError as slack_error:
            error_type = slack_error.response["error"]
            if error_type == "invalid_auth":
                logger.exception("SlackApiError. HubSlackIntegration has invalid token")
            elif error_type == "channel_not_found":
                logger.exception('SlackApiError. No such channel "%s" for HubSlackIntegration', channel)
            else:
                logger.warning("Generic SlackApiError: %s", slack_error.response)

    def send_org_message(self, channel, text, blocks, organization):
        org_client = self.get_org_client()
        try:
            org_client.chat_postMessage(channel=channel, text=text, blocks=blocks)
        except SlackApiError as slack_error:
            error_type = slack_error.response["error"]
            if error_type == "invalid_auth":
                logger.warning(
                    'SlackApiError. Org "%s" has an invalid token. SlackError: %s',
                    organization.name,
                    slack_error.response,
                )
            elif error_type == "channel_not_found":
                logger.warning(
                    'SlackApiError. No such channel "%s" for %s. SlackError: %s',
                    channel,
                    organization.name,
                    slack_error.response,
                )
            else:
                logger.warning(
                    'Generic SlackApiError for Org "%s" to channel "%s". SlackError: %s',
                    organization.name,
                    channel,
                    slack_error.response,
                )

    def send_hub_notifications(self, contribution):
        main_channel = self.hub_integration.channel
        org_channel = self.get_org_channel(contribution.donation_page.organization)
        main_blocks = self.construct_hub_blocks(contribution)
        main_text = self.construct_hub_text(contribution)
        org_text = self.construct_org_text(contribution)
        org_blocks = self.construct_org_blocks(contribution)
        self.send_hub_message(main_channel, main_text, main_blocks)
        self.send_hub_message(org_channel, org_text, org_blocks)

    def send_org_notifications(self, contribution):
        main_channel = self.org_integration.channel
        blocks = self.construct_org_blocks(contribution)
        text = self.construct_org_text(contribution)
        self.send_org_message(main_channel, text, blocks, contribution.revenue_program.organization)

    def publish_contribution(self, contribution, event_type=None):
        """
        Sends the following Slack notifications:
         - Hub general channel
         - Hub org-specific channel
         - Org specified channel

         event_type always None for now, since we only support success messages
        """
        if self.hub_integration:
            self.send_hub_notifications(contribution)

        self.org_integration = self.get_org_integration(contribution.revenue_program.organization)
        if self.org_integration:
            self.send_org_notifications(contribution)
