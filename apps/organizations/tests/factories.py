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
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{fake.company()}-{str(n)}")
    stripe_account_id = fake.uuid4()
    contact_email = fake.email()


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=4))}-{str(n)}")
    organization = factory.SubFactory(OrganizationFactory)


class BenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.Benefit

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    description = fake.sentence(nb_words=8)


class BenefitLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitLevel

    name = factory.Sequence(lambda n: fake.sentence(nb_words=2))
    organization = factory.SubFactory(OrganizationFactory)

    lower_limit = 1
