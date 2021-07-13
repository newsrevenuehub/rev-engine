import datetime
import random

from django.conf import settings

import factory
import pytz
from factory.django import DjangoModelFactory
from factory.helpers import create
from faker import Faker

from apps.common.tests.test_utils import generate_random_datetime
from apps.contributions import models


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
        return models.ContributionStatus.FLAGGED[0]
    return random.choice(
        [
            models.ContributionStatus.PROCESSING[0],
            models.ContributionStatus.PAID[0],
            models.ContributionStatus.CANCELED[0],
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
