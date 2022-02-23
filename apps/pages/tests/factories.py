import factory
from factory.django import DjangoModelFactory

from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages import models


class DonationPageFactory(DjangoModelFactory):
    class Meta:
        model = models.DonationPage

    heading = factory.Sequence(lambda n: "Test Page %d" % n)
    slug = factory.Sequence(lambda n: "test-page-%d" % n)
    revenue_program = factory.SubFactory(RevenueProgramFactory)


class TemplateFactory(DjangoModelFactory):
    class Meta:
        model = models.Template

    name = factory.Sequence(lambda n: "Test Template %d" % n)
    heading = factory.Sequence(lambda n: "Test Template %d" % n)
    revenue_program = factory.SubFactory(RevenueProgramFactory)


class StyleFactory(DjangoModelFactory):
    class Meta:
        model = models.Style

    class Params:
        org = None

    name = factory.Sequence(lambda n: "Test Style %d" % n)
    styles = {"colors": {"primary": "testing-pink"}}
    revenue_program = factory.SubFactory(RevenueProgramFactory)
