import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.organizations import models


fake = Faker()
Faker.seed(0)


class PlanFactory(DjangoModelFactory):
    class Meta:
        model = models.Plan

    name = fake.word()


class FeatureFactory(DjangoModelFactory):
    class Meta:
        model = models.Feature

    name = " ".join(fake.words(nb=2))
    description = fake.text()


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization

    name = fake.company()
    slug = factory.Sequence(lambda n: "test-slug-%d" % n)


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram

    name = " ".join(fake.words(nb=4))
    organization = factory.SubFactory(OrganizationFactory)
