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


class BenefitLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitLevel

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)

    lower_limit = 1
    level = 1
