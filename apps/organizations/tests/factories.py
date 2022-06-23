from random import choice, randrange

import factory
import factory.fuzzy
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.models import Address
from apps.common.utils import normalize_slug
from apps.organizations import models


fake = Faker()
Faker.seed(0)


class AddressFactory(DjangoModelFactory):
    class Meta:
        model = Address


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
    address = factory.SubFactory(AddressFactory)
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
