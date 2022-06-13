import factory
from factory.django import DjangoModelFactory

from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages import models


class DonationPageFactory(DjangoModelFactory):
    class Meta:
        model = models.DonationPage
        django_get_or_create = ("slug",)

    name = factory.Sequence(lambda n: f"Test page {n} name")
    heading = factory.Sequence(lambda n: "Test Page %d heading" % n)
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


class FontFactory(DjangoModelFactory):
    class Meta:
        model = models.Font

    name = factory.Sequence(lambda n: "Test Font %d" % n)
    source = models.Font.FontSourceChoices.GOOGLE_FONTS[0]
    font_name = factory.Sequence(lambda n: "Test Font Name %d" % n)
