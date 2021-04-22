import factory
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages import models
from factory.django import DjangoModelFactory


class PageFactory(DjangoModelFactory):
    class Meta:
        model = models.Page

    title = factory.Sequence(lambda n: "Test Page %d" % n)
    slug = factory.Sequence(lambda n: "test-page-%d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class TemplateFactory(DjangoModelFactory):
    class Meta:
        model = models.Template

    name = factory.Sequence(lambda n: "Test Page %d" % n)
    title = factory.Sequence(lambda n: "Test Page %d" % n)
    organization = factory.SubFactory(OrganizationFactory)


class DonorBenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.DonorBenefit

    name = factory.Sequence(lambda n: "Test DonorBenefit %d" % n)
    organization = factory.SubFactory(OrganizationFactory)
