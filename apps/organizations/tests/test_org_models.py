from django.core.exceptions import ValidationError
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


class BenefitLevelTest(TestCase):
    def setUp(self):
        self.lower_limit = 50
        self.upper_limit = 100
        self.benefit_level = factories.BenefitLevelFactory(
            upper_limit=self.upper_limit,
            lower_limit=self.lower_limit,
        )

    def test_donation_range_when_normal(self):
        self.assertEqual(
            self.benefit_level.donation_range, f"${self.benefit_level.lower_limit}-{self.benefit_level.upper_limit}"
        )

    def test_donation_range_when_no_upper(self):
        self.benefit_level.upper_limit = None
        self.benefit_level.save()
        self.assertEqual(self.benefit_level.donation_range, f"${self.benefit_level.lower_limit}+")

    def test_upper_lower_limit_validation(self):
        self.benefit_level.upper_limit = self.benefit_level.lower_limit - 1
        with self.assertRaises(ValidationError) as v_error:
            self.benefit_level.clean()

        self.assertEqual(v_error.exception.message, "Upper limit must be greater than lower limit")
