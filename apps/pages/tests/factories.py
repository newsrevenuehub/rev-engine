import factory
from factory.django import DjangoModelFactory

from apps.organizations.tests.factories import OrganizationFactory
from apps.pages import models


class DonationPageFactory(DjangoModelFactory):
    class Meta:
        model = models.DonationPage

    title = factory.Sequence(lambda n: "Test Page %d" % n)
    slug = factory.Sequence(lambda n: "test-page-%d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class TemplateFactory(DjangoModelFactory):
    class Meta:
        model = models.Template

    name = factory.Sequence(lambda n: "Test Template %d" % n)
    title = factory.Sequence(lambda n: "Test Template %d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class DonorBenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.DonorBenefit

    name = factory.Sequence(lambda n: "Test DonorBenefit %d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class StyleFactory(DjangoModelFactory):
    class Meta:
        model = models.Style

    name = factory.Sequence(lambda n: "Test Style %d" % n)
    organization = factory.SubFactory(OrganizationFactory)
    styles = "/{/}"


class BenefitTierFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitTier

    name = factory.Sequence(lambda n: "Test Style %d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class BenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.Benefit

    name = factory.Sequence(lambda n: "Test Style %d" % n)
    organization = factory.SubFactory(OrganizationFactory)
