import datetime
import json
import random
import string
import uuid
from pathlib import Path

from django.conf import settings
from django.utils import timezone

import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.contributions import models
from apps.contributions.serializers import StripePaymentMetadataSchemaV1_4
from apps.organizations.models import PaymentProvider
from apps.pages.tests.factories import DonationPageFactory


fake = Faker()


with Path("apps/contributions/tests/fixtures/provider-payment-method-details.json").open() as f:
    PAYMENT_METHOD_DETAILS_DATA = json.load(f)


class ContributorFactory(DjangoModelFactory):
    class Meta:
        model = models.Contributor
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"{fake.user_name()}-{n}@{fake.domain_name()}")


def _get_status(bad_actor_score):
    if bad_actor_score == settings.BAD_ACTOR_REJECT_SCORE:
        return models.ContributionStatus.REJECTED
    if bad_actor_score == settings.BAD_ACTOR_FLAG_SCORE:
        return models.ContributionStatus.FLAGGED
    return random.choice(
        [
            models.ContributionStatus.PROCESSING,
            models.ContributionStatus.PAID,
            models.ContributionStatus.CANCELED,
        ]
    )


NOW = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
THEN = NOW - datetime.timedelta(weeks=52)


def _random_stripe_str(length: int = 10) -> str:
    return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))


def generate_random_datetime(start, end):
    return start + datetime.timedelta(seconds=random.randint(0, int((end - start).total_seconds())))


class ContributionFactory(DjangoModelFactory):
    class Meta:
        model = models.Contribution

    created = factory.LazyFunction(lambda: generate_random_datetime(THEN, NOW))
    amount = factory.LazyFunction(lambda: random.randrange(1, 10000) * 100)
    reason = factory.LazyFunction(lambda: fake.paragraph())
    interval = factory.LazyFunction(lambda: random.choice(models.ContributionInterval.choices)[0])
    # load this from fixture
    bad_actor_response = None
    bad_actor_score = factory.LazyFunction(lambda: random.choice([0, 1, 2, 3, 4]))

    status = factory.LazyAttribute(lambda o: _get_status(o.bad_actor_score))
    donation_page = factory.SubFactory(DonationPageFactory)
    contributor = factory.SubFactory(ContributorFactory)
    uuid = factory.LazyFunction(lambda: str(uuid.uuid4()))
    payment_provider_used = PaymentProvider.STRIPE_LABEL
    provider_customer_id = None
    provider_payment_method_id = factory.LazyFunction(lambda: f"pm_{_random_stripe_str()}")
    provider_payment_method_details = factory.LazyFunction(lambda: PAYMENT_METHOD_DETAILS_DATA)

    @factory.lazy_attribute
    def contribution_metadata(self):
        return StripePaymentMetadataSchemaV1_4(
            contributor_id=str(self.contributor.id) if self.contributor else None,
            agreed_to_pay_fees=True,
            donor_selected_amount=self.amount / 100,
            referer=f"https://www.{settings.DOMAIN_APEX}.com/",
            revenue_program_id=str(self.donation_page.revenue_program_id) if self.donation_page else "3737",
            revenue_program_slug=self.donation_page.revenue_program.slug if self.donation_page else "slug",
            source="rev-engine",
            schema_version="1.4",
        ).model_dump(mode="json")

    class Params:
        # this is roughly how a successful one-time contribution would look
        one_time = factory.Trait(
            interval=models.ContributionInterval.ONE_TIME,
            status=models.ContributionStatus.PAID,
            provider_payment_id=factory.LazyFunction(lambda: f"pi_{_random_stripe_str()}"),
            provider_customer_id=f"cus_{_random_stripe_str()}",
        )

        # this is roughly how a successful recurring annual contribution would look
        annual_subscription = factory.Trait(
            interval=models.ContributionInterval.YEARLY,
            status=models.ContributionStatus.PAID,
            provider_subscription_id=factory.LazyFunction(lambda: f"sub_{_random_stripe_str()}"),
            provider_customer_id=f"cus_{_random_stripe_str()}",
        )
        # this is roughly how a successful recurring annual contribution would look
        monthly_subscription = factory.Trait(
            interval=models.ContributionInterval.MONTHLY,
            status=models.ContributionStatus.PAID,
            provider_subscription_id=factory.LazyFunction(lambda: f"sub_{_random_stripe_str()}"),
            provider_customer_id=f"cus_{_random_stripe_str()}",
        )
        flagged = factory.Trait(
            status=models.ContributionStatus.FLAGGED,
            flagged_date=factory.LazyAttribute(lambda o: o.created + datetime.timedelta(hours=1)),
            provider_setup_intent_id=factory.LazyAttribute(
                lambda o: None if o.interval == models.ContributionInterval.ONE_TIME else f"seti_{_random_stripe_str()}"
            ),
            provider_subscription_id=None,
        )
        rejected = factory.Trait(status=models.ContributionStatus.REJECTED)
        canceled = factory.Trait(status=models.ContributionStatus.CANCELED)
        refunded = factory.Trait(status=models.ContributionStatus.REFUNDED)
        processing = factory.Trait(status=models.ContributionStatus.PROCESSING)
        abandoned = factory.Trait(
            status=models.ContributionStatus.ABANDONED,
            created=timezone.now() - (datetime.timedelta() + timezone.timedelta(days=1)),
            provider_payment_method_id=None,
            provider_payment_method_details=None,
        )
        unmarked_abandoned = factory.Trait(
            abandoned=True,
            status=factory.LazyFunction(
                lambda: random.choice(models.ContributionStatus.FLAGGED, models.ContributionStatus.PROCESSING)[0]
            ),
        )


class PaymentFactory(DjangoModelFactory):
    class Meta:
        model = models.Payment

    created = factory.LazyFunction(lambda: generate_random_datetime(THEN, NOW))
    contribution = factory.SubFactory(ContributionFactory)
    net_amount_paid = 1980
    gross_amount_paid = 2000
    amount_refunded = 0
    stripe_balance_transaction_id = factory.LazyFunction(lambda: f"txn_{_random_stripe_str()}")
    transaction_time = factory.LazyFunction(lambda: generate_random_datetime(THEN, NOW))

    class Params:
        refund = factory.Trait(amount_refunded=1000)
        paid = factory.Trait(amount_refunded=0, net_amount_paid=2000, gross_amount_paid=2010)
