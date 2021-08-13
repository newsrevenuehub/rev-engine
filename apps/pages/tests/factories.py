import json

import factory
from factory.django import DjangoModelFactory

from apps.organizations.tests.factories import OrganizationFactory
from apps.pages import models


class DonationPageFactory(DjangoModelFactory):
    class Meta:
        model = models.DonationPage

    class Params:
        org = None

    heading = factory.Sequence(lambda n: "Test Page %d" % n)
    slug = factory.Sequence(lambda n: "test-page-%d" % n)

    @factory.lazy_attribute
    def organization(self):
        if self.org:
            return self.org
        return OrganizationFactory()


class TemplateFactory(DjangoModelFactory):
    class Meta:
        model = models.Template

    class Params:
        org = None

    name = factory.Sequence(lambda n: "Test Template %d" % n)
    heading = factory.Sequence(lambda n: "Test Template %d" % n)

    @factory.lazy_attribute
    def organization(self):
        if self.org:
            return self.org
        return OrganizationFactory()


class StyleFactory(DjangoModelFactory):
    class Meta:
        model = models.Style

    class Params:
        org = None

    name = factory.Sequence(lambda n: "Test Style %d" % n)
    styles = {"colors": {"primary": "testing-pink"}}

    @factory.lazy_attribute
    def organization(self):
        if self.org:
            return self.org
        return OrganizationFactory()
