from django.db import models

from apps.common.models import IndexedTimeStampedModel


class Organization(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField()

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    STRIPE = ("stripe", "Stripe")
    SUPPORTED_PROVIDERS = (STRIPE,)
    default_payment_provider = models.CharField(
        max_length=100, choices=SUPPORTED_PROVIDERS, default=STRIPE[0]
    )
    stripe_account_id = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name

    def user_is_member(self, user):
        return user in self.users.all()


class RevenueProgram(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name
