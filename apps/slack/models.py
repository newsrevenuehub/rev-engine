from django.db import models

from solo.models import SingletonModel

from apps.organizations.models import Organization


def format_channel_name(val):
    if val and val[0] != "#":
        val = "#" + val
    return val


class SlackNotificationTypes(models.TextChoices):
    SUCCESS = "success", "Success"


class SlackIntegration(models.Model):
    bot_token = models.CharField(max_length=255)
    channel = models.CharField(max_length=255, help_text="All donation notifications will be sent to this channel")

    def save(self, *args, **kwargs):
        self.channel = format_channel_name(self.channel)
        super().save(*args, **kwargs)

    class Meta:
        abstract = True


class HubSlackIntegration(SlackIntegration, SingletonModel):
    org_channel_prefix = models.CharField(
        max_length=24,
        default="donations-",
        help_text="Donation notifications will be sent to [org-channel-prefix][recipient-org-name]",
    )

    def __str__(self):
        return "News Revenue Hub Slack integration config"

    def save(self, *args, **kwargs):
        self.org_channel_prefix = format_channel_name(self.org_channel_prefix)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "[News Revenue Hub] Slack integration config"


class OrganizationSlackIntegration(SlackIntegration):
    organization = models.OneToOneField(
        Organization, primary_key=True, on_delete=models.CASCADE, related_name="slack_integration"
    )

    def __str__(self):
        return f"[{self.organization.name}] Slack integration config"
