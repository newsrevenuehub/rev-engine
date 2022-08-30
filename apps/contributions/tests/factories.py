import datetime
import random

from django.conf import settings

import factory
import pytz
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.tests.test_utils import generate_random_datetime
from apps.contributions import models
from apps.pages.tests.factories import DonationPageFactory


fake = Faker()


class ContributorFactory(DjangoModelFactory):
    class Meta:
        model = models.Contributor
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"{fake.user_name()}-{n}@{fake.domain_name()}")


def _get_flagged_date(bad_actor_score, created_at):
    if bad_actor_score >= settings.BAD_ACTOR_FAIL_ABOVE:
        return created_at + datetime.timedelta(hours=1)
    return None


def _get_status(bad_actor_score):
    if bad_actor_score >= settings.BAD_ACTOR_FAIL_ABOVE:
        return models.ContributionStatus.FLAGGED
    return random.choice(
        [
            models.ContributionStatus.PROCESSING,
            models.ContributionStatus.PAID,
            models.ContributionStatus.CANCELED,
        ]
    )


def _get_last_payment_date(created_date, bad_actor_score):
    if bad_actor_score >= settings.BAD_ACTOR_FAIL_ABOVE:
        return None
    return created_date + datetime.timedelta(hours=1)


NOW = datetime.datetime.now(tz=pytz.UTC) - datetime.timedelta(days=1)
THEN = NOW - datetime.timedelta(weeks=52)


class ContributionFactory(DjangoModelFactory):
    class Meta:
        model = models.Contribution

    created = factory.LazyFunction(lambda: generate_random_datetime(THEN, NOW))
    amount = factory.LazyFunction(lambda: random.randrange(1, 10000) * 100)
    reason = factory.LazyFunction(lambda: fake.paragraph())
    interval = factory.LazyFunction(lambda: random.choice(models.ContributionInterval.choices)[0])
    bad_actor_score = factory.LazyFunction(lambda: random.choice([0, 1, 2, 3, 4]))
    last_payment_date = factory.LazyAttribute(lambda o: _get_last_payment_date(o.created, o.bad_actor_score))
    flagged_date = factory.LazyAttribute(lambda o: _get_flagged_date(o.bad_actor_score, o.created))
    status = factory.LazyAttribute(lambda o: _get_status(o.bad_actor_score))
    payment_provider_used = "Stripe"
    donation_page = factory.SubFactory(DonationPageFactory)
    contributor = factory.SubFactory(ContributorFactory)


class StripeCustomerFactory:
    id = fake.uuid4()
    email = factory.Sequence(lambda n: f"{fake.user_name()}-{n}@{fake.domain_name()}")


class StripeSubscriptionFactory:
    id = fake.uuid4()
    customer = StripeCustomerFactory()

    def delete(subscription_id):
        pass


# class StripeSubscriptionFactory:
#     customer = StripeCustomerFactory()
#     interval = random.choice(list(models.ContributionInterval.__members__.values()))
#     card_brand = random.choice(list(models.CardBrand.__members__.values()))
#     is_modifiable = random.choice([True, False])
#     is_cancelable = random.choice([True, False])
#     last4 = random.randint(1111, 9999)
#     amount = random.uniform(0, 1000)
#     created = fake.date_time_between(start_date="-5d", end_date="now")
#     customer_id = fake.uuid4()
#     last_payment_date = fake.date_time_between(start_date="-5d", end_date="now")
#     status = random.choice(list(models.ContributionStatus.__members__.values()))
#     credit_card_expiration_date = f"{random.randint(1, 12)}/{random.randint(2022, 2099)}"
#     payment_type = random.choice(list(models.PaymentType.__members__.values()))
#     next_payment_date = fake.date_time_between(start_date="now", end_date="+60d")
#     default_payment_method =
#     id = fake.uuid4()

#     def __init__(self, revenue_program=None) -> None:
#         self.revenue_program = revenue_program
#         if not revenue_program:
#             self.revenue_program = normalize_slug(f"{' '.join(fake.words(nb=4))}")

#     def delete(subscription_id):
#        pass
