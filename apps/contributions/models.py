from django.db import models

import stripe

from apps.common.models import IndexedTimeStampedModel
from apps.contributions.utils import get_hub_stripe_api_key


class Contributor(IndexedTimeStampedModel):
    email = models.EmailField()

    @property
    def contributions_count(self):
        return self.contribution_set.count()

    @property
    def most_recent_contribution(self):
        return self.contribution_set.filter(payment_state="paid").latest()

    def __str__(self):
        return self.email

    def get_stripe_customer_for_organization(self, organization):
        """
        Stripe Customers are not unique by email. Thus, finding a single Customer instance by email address is not supported. The best we can do here is list all the customers that have that email address.
        In this case, we ought to treat "has any customers matching this email address" as "has stripe customer". For

        A single Stripe Customer may have unqiue information attached that we need. In particular, a Customer is created with a default payment method.  This payment method is used to capture each payment of a recurring donation.
        That is why it's important to store the actually unique Customer pk on the Contribution itself, as provider_customer_id.
        """
        stripe_customers = stripe.Customer.list(
            email=self.email, api_key=get_hub_stripe_api_key(), stripe_account=organization.stripe_account_id
        )
        # ??
        return list(stripe_customers)[0]

    def get_or_create_stripe_customer_for_organization(self, organization):
        """
        Create a Stripe Customer for this organization, if they have no customers matching self.email. O
        """
        stripe_customer = self.get_stripe_customer_for_organization(organization)
        if not stripe_customer:
            stripe_customer = stripe.Customer.create(
                email=self.email, api_key=get_hub_stripe_api_key(), stripe_account=organization.stripe_account_id
            )
        return stripe_customer


class Contribution(IndexedTimeStampedModel):
    amount = models.IntegerField(help_text="Stored in cents")
    currency = models.CharField(max_length=3, default="usd")
    reason = models.CharField(max_length=255, blank=True)

    payment_provider_used = models.CharField(max_length=64)
    payment_provider_data = models.JSONField(null=True)
    provider_reference_id = models.CharField(max_length=255)

    provider_customer_id = models.CharField(max_length=255, blank=True)

    contributor = models.ForeignKey("contributions.Contributor", on_delete=models.SET_NULL, null=True)
    donation_page = models.ForeignKey("pages.DonationPage", on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True)
    bad_actor_score = models.IntegerField(null=True)
    bad_actor_response = models.JSONField(null=True)
    flagged_date = models.DateTimeField(null=True)

    PROCESSING = (
        "processing",
        "processing",
    )
    PAID = (
        "paid",
        "paid",
    )
    CANCELED = (
        "canceled",
        "canceled",
    )
    FLAGGED = (
        "flagged",
        "flagged",
    )
    FAILED = (
        "failed",
        "failed",
    )
    REJECTED = (
        "rejected",
        "rejected",
    )
    PAYMENT_STATES = [PROCESSING, PAID, CANCELED, FAILED, FLAGGED, REJECTED]
    payment_state = models.CharField(max_length=10, choices=PAYMENT_STATES)

    def __str__(self):
        return f"{self.formatted_amount}, {self.created.strftime('%Y-%m-%d %H:%M:%S')}"

    @property
    def formatted_amount(self):
        return f"{float(self.amount / 100)} {self.currency.upper()}"

    BAD_ACTOR_SCORES = (
        (
            0,
            "0 - Information",
        ),
        (
            1,
            "1 - Unknown",
        ),
        (
            2,
            "2 - Good",
        ),
        (
            3,
            "3 - Suspect",
        ),
        (
            4,
            "4 - Bad",
        ),
    )

    @property
    def expanded_bad_actor_score(self):
        if not self.bad_actor_score:
            return None
        return self.BAD_ACTOR_SCORES[self.bad_actor_score][1]

    def get_payment_manager_instance(self, serializer):
        from apps.contributions.payment_managers import PaymentManager

        manager_class = PaymentManager(serializer, contribution=self).get_subclass()
        return manager_class(serializer, contribution=self)

    class Meta:
        get_latest_by = "modified"
