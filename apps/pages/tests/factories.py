from datetime import timedelta

from django.utils import timezone

import factory
from factory.django import DjangoModelFactory

from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages import models


class DonationPageFactory(DjangoModelFactory):
    class Meta:
        model = models.DonationPage
        django_get_or_create = ("slug", "revenue_program")

    name = factory.Sequence(lambda n: f"Test page {n} name")
    heading = factory.Sequence(lambda n: f"Test Page {n} heading")
    slug = factory.Sequence(lambda n: f"test-page-{n}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)

    class Params:
        published = factory.Trait(published_date=factory.LazyFunction(lambda: timezone.now() - timedelta(days=7)))


class StyleFactory(DjangoModelFactory):
    class Meta:
        model = models.Style
        django_get_or_create = ("name", "revenue_program")

    name = factory.Sequence(lambda n: f"Test Style {n}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)
    styles = factory.LazyFunction(
        lambda: {
            "radii": ["3px", "6px", "12px"],
            "font": {"body": "'Roboto', sans-serif", "heading": "'Roboto', sans-serif"},
            "fontSizes": ["12px", "16px", "24px", "32px", "48px", "84px", "96px"],
        }
    )


class FontFactory(DjangoModelFactory):
    class Meta:
        model = models.Font

    name = factory.Sequence(lambda n: f"Test Font {n}")
    source = models.Font.FontSourceChoices.GOOGLE_FONTS[0]
    font_name = factory.Sequence(lambda n: f"Test Font Name {n}")
