from random import choice, randint, randrange, uniform

import factory
import factory.fuzzy
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.utils import normalize_slug
from apps.contributions.models import (
    CardBrand,
    ContributionInterval,
    ContributionStatus,
    PaymentType,
)
from apps.organizations import models


fake = Faker()
Faker.seed(0)


class FeatureFactory(DjangoModelFactory):
    class Meta:
        model = models.Feature
        django_get_or_create = ("feature_type", "feature_value")

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=2))}-{str(n)}")
    description = fake.text()
    feature_type = factory.fuzzy.FuzzyChoice(models.Feature.FeatureType.choices, getter=lambda c: c[0])

    @factory.lazy_attribute
    def feature_value(self):
        if self.feature_type == models.Feature.FeatureType.BOOLEAN:
            return choice(models.Feature.VALID_BOOLEAN_INPUTS)
        if self.feature_type == models.Feature.FeatureType.PAGE_LIMIT:
            return randrange(1, 25)


class PlanFactory(DjangoModelFactory):
    class Meta:
        model = models.Plan

    name = fake.word()


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{fake.company()}-{str(n)}")
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))
    plan = factory.SubFactory("apps.organizations.tests.factories.PlanFactory")


class PaymentProviderFactory(DjangoModelFactory):
    class Meta:
        model = models.PaymentProvider

    stripe_account_id = factory.Sequence(lambda n: fake.uuid4())
    stripe_verified = True


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=4))}-{str(n)}")
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))
    contact_email = fake.email()
    payment_provider = factory.SubFactory(PaymentProviderFactory)

    class Params:
        org = None

    @factory.lazy_attribute
    def organization(self):
        if self.org:
            return self.org
        return OrganizationFactory()


class BenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.Benefit

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    description = fake.sentence(nb_words=8)
    revenue_program = factory.SubFactory(RevenueProgramFactory)


class BenefitLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitLevel

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)

    lower_limit = 1
    level = 1


class StripePaymentIntentFactory:
    interval = choice(list(ContributionInterval.__members__.values()))
    card_brand = choice(list(CardBrand.__members__.values()))
    is_modifiable = choice([True, False])
    is_cancelable = choice([True, False])
    last4 = randint(1111, 9999)
    amount = uniform(0, 1000)
    created = fake.date_time_between(start_date="-5d", end_date="now")
    provider_customer_id = fake.uuid4()
    last_payment_date = fake.date_time_between(start_date="-5d", end_date="now")
    status = choice(list(ContributionStatus.__members__.values()))
    credit_card_expiration_date = f"{randint(1, 12)}/{randint(2022, 2099)}"
    payment_type = choice(list(PaymentType.__members__.values()))
    refunded = choice([True, False])
    id = fake.uuid4()

    def __init__(self, revenue_program=None) -> None:
        self.revenue_program = revenue_program
        if not revenue_program:
            self.revenue_program = normalize_slug(f"{' '.join(fake.words(nb=4))}")
