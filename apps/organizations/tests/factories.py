import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.organizations import models


fake = Faker()
Faker.seed(0)


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

    name = factory.Sequence(lambda n: f"{fake.company()}-{str(n)}")
    stripe_account_id = fake.uuid4()


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=4))}-{str(n)}")
    organization = factory.SubFactory(OrganizationFactory)
