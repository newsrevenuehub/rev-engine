from django.test import TestCase
from django.utils.text import slugify

from faker import Faker

from apps.organizations import models
from apps.organizations.tests import factories


class OrganizationTest(TestCase):
    def setUp(self):
        self.model_class = models.Organization
        self.instance = factories.OrganizationFactory()

    def test_slug_created(self):
        assert self.instance.slug

    def test_slug_equals_orgname(self):
        self.assertEqual(self.instance.slug, slugify(self.instance.name, allow_unicode=True))

    def test_slug_immutable(self):
        self.instance.name = "A new Name"
        self.instance.save()
        self.instance.refresh_from_db()
        self.assertNotIn(slugify("A new Name"), self.instance.slug)

    def test_default_no_plan(self):
        assert not self.instance.plan


class RevenueProgramTest(TestCase):
    def setUp(self):
        self.model_class = models.RevenueProgram
        self.instance = factories.RevenueProgramFactory()

    def test_slug_created(self):
        assert self.instance.slug

    def test_has_an_org(self):
        assert self.instance.organization

    def test_slug_immutable(self):
        self.instance.name = "A new Name"
        self.instance.save()
        self.instance.refresh_from_db()
        self.assertNotIn(slugify("A new Name"), self.instance.slug)

    def test_slug_larger_than_100(self):
        fake = Faker()
        Faker.seed(0)
        self.instance = factories.RevenueProgramFactory(name=f"{' '.join(fake.words(nb=30))}")
        self.assertLessEqual(len(self.instance.slug), 100)

    def test_delete_organization_cleans_up(self):
        assert len(self.model_class.objects.all()) == 1
        org = self.instance.organization
        org.delete()
        assert len(self.model_class.objects.all()) == 0
