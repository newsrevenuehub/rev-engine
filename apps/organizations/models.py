from django.conf import settings
from django.db import models
from django.urls import reverse

import stripe
from djstripe.enums import APIKeyType
from djstripe.fields import StripeForeignKey
from djstripe.models import Account
from djstripe.models.api import APIKey

from apps.common.models import IndexedTimeStampedModel


class Organization(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField()

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    stripe_account = StripeForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    @property
    def stripe_public_key(self):
        if not self.stripe_account:
            return None
        return APIKey.objects.filter(
            djstripe_owner_account=self.stripe_account, type=APIKeyType.public
        ).first()

    STRIPE_WEBHOOK_EVENTS = [
        "payment_intent.canceled",
        "payment_intent.created",
        "payment_intent.payment_failed",
        "payment_intent.processing",
        "payment_intent.requires_action",
        "payment_intent.succeeded",
    ]

    def __str__(self):
        return self.name

    def user_is_member(self, user):
        return user in self.users.all()

    def setup_organization_stripe_webhooks(self):
        if not self.stripe_account:
            # raise something
            pass
        base_url = settings.SITE_URL
        webhook_url = base_url + reverse("djstripe:webhook")
        stripe.WebhookEndpoint.create(url=webhook_url, enabled_events=self.STRIPE_WEBHOOK_EVENTS)


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name
