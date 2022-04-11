import factory
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

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=2))}-{str(n)}")
    feature_value = factory.Sequence(lambda n: f"{n}")
    description = fake.text()


class PlanFactory(DjangoModelFactory):
    class Meta:
        model = models.Plan

    name = fake.word()


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{fake.company()}-{str(n)}")
    stripe_account_id = fake.uuid4()
    address = factory.SubFactory(AddressFactory)
    stripe_verified = True
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=4))}-{str(n)}")
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))
    organization = factory.SubFactory(OrganizationFactory)
    contact_email = fake.email()


class BenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.Benefit

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    description = fake.sentence(nb_words=8)


class BenefitLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitLevel

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)

    lower_limit = 1
    level = 1
