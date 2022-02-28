from django.conf import settings
from django.utils import timezone

from rest_framework import serializers
from rest_framework.test import APIRequestFactory, APITestCase

from apps.organizations.models import BenefitLevelBenefit, RevenueProgramBenefitLevel
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.serializers import (
    DonationPageFullDetailSerializer,
    StyleListSerializer,
    TemplateDetailSerializer,
)
from apps.pages.tests.factories import DonationPageFactory, StyleFactory, TemplateFactory
from apps.pages.validators import required_style_keys


class DonationPageFullDetailSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()

        self.benefit_1 = BenefitFactory(organization=self.organization)
        self.benefit_2 = BenefitFactory(organization=self.organization)

        self.benefit_level_1 = BenefitLevelFactory(organization=self.organization)

        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_1, order=1)
        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_2, order=2)

        self.benefit_level_2 = BenefitLevelFactory(organization=self.organization)

        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_2, benefit=self.benefit_1, order=1)

        self.revenue_program = RevenueProgramFactory(
            organization=self.organization,
            google_analytics_v3_domain="somedomain.com",
            google_analytics_v3_id="thisIsAV3Id",
            google_analytics_v4_id="thisIsAV4Id",
            facebook_pixel_id="thiIsAFbPixelId",
        )
        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.revenue_program, benefit_level=self.benefit_level_1, level=1
        )
        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.revenue_program, benefit_level=self.benefit_level_2, level=2
        )

        self.page = DonationPageFactory(revenue_program=self.revenue_program)
        self.serializer = DonationPageFullDetailSerializer
        self.request_factory = APIRequestFactory()

    def _create_request_for_serializer(self, data=None):
        if not data:
            data = {settings.ORG_SLUG_PARAM: self.organization.slug, settings.RP_SLUG_PARAM: self.revenue_program.slug}
        return self.request_factory.get("/", data=data)

    def test_has_analytics_data(self):
        serializer = self.serializer(self.page)
        data = serializer.data
        for key in (
            "google_analytics_v3_domain",
            "google_analytics_v3_id",
            "google_analytics_v4_id",
            "facebook_pixel_id",
        ):
            self.assertEqual(data["revenue_program"][key], getattr(self.revenue_program, key))

    def test_get_benefit_levels(self):
        serializer = self.serializer(self.page)
        data = serializer.data

        # Should have the righ amount of benefit levels...
        self.assertEqual(len(data["benefit_levels"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["name"], self.benefit_level_1.name)

        # Benefit level should have the right number of benefits...
        self.assertEqual(len(data["benefit_levels"][0]["benefits"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["benefits"][0]["name"], self.benefit_1.name)

    def test_get_organization_is_nonprofit(self):
        # Set it true, expect it in page serializer
        self.organization.non_profit = True
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], True)

        # Set it false, expect it in page serializer
        self.organization.non_profit = False
        self.organization.save()
        self.organization.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], False)

    def test_check_against_soft_deleted_slugs(self):
        validated_data = {"slug": self.page.slug}
        serializer = self.serializer(self.page)
        # It should return none if slug isn't a deleted slug
        self.assertIsNone(serializer._check_against_soft_deleted_slugs(validated_data))

        # Delete w/ soft-delete (default) raises validation error
        self.page.delete()
        serializer = self.serializer(self.page)
        self.assertRaises(serializers.ValidationError, serializer._check_against_soft_deleted_slugs, validated_data)

    def test_create_with_template_pk_uses_template_as_data(self):
        template = TemplateFactory()
        # new_page_name
        new_page_data = {
            "template_pk": template.pk,
            "name": "My New Page From a Template",
            "slug": "my-new-page-from-a-template",
        }
        serializer = self.serializer(data=new_page_data)
        request = self._create_request_for_serializer()
        serializer.context["request"] = request
        self.assertTrue(serializer.is_valid())
        new_page = serializer.save()
        self.assertEqual(new_page.heading, template.heading)

    def test_create_with_template_pk_throws_error_if_template_missing(self):
        new_page_data = {
            "template_pk": 99999,
            "name": "My New Page From a Template",
            "slug": "my-new-page-from-a-template",
        }
        serializer = self.serializer(data=new_page_data)
        request = self._create_request_for_serializer()
        serializer.context["request"] = request
        self.assertTrue(serializer.is_valid())
        # Should raise validation error if invalid pk
        with self.assertRaises(serializers.ValidationError) as v_error:
            serializer.save()
        self.assertIn("template", v_error.exception.detail)
        self.assertEqual(str(v_error.exception.detail["template"][0]), "This template no longer exists")

    def test_live_context_adds_org_stripe_account_id(self):
        serializer = self.serializer(self.page, context={"live": False})
        self.assertIsNone(serializer.data["stripe_account_id"])

        serializer = self.serializer(self.page, context={"live": True})
        self.assertIsNotNone(serializer.data["stripe_account_id"])
        self.assertEqual(serializer.data["stripe_account_id"], self.page.organization.stripe_account_id)

    def test_not_live_context_adds_allow_offer_nyt_comp(self):
        serializer = self.serializer(self.page, context={"live": True})
        self.assertIsNone(serializer.data["allow_offer_nyt_comp"])

        serializer = self.serializer(self.page, context={"live": False})
        self.assertIsNotNone(serializer.data["allow_offer_nyt_comp"])
        self.assertEqual(serializer.data["allow_offer_nyt_comp"], self.page.revenue_program.allow_offer_nyt_comp)


class TemplateDetailSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.template = TemplateFactory()
        self.page = DonationPageFactory()
        self.serializer = TemplateDetailSerializer

    def test_create_with_page_pk_uses_page_as_template(self):
        template_data = {
            "page_pk": self.page.pk,
            "name": "My New Template",
            "organization": self.organization.pk,
        }
        serializer = self.serializer(data=template_data)
        self.assertTrue(serializer.is_valid())
        new_template = serializer.save()
        self.assertEqual(new_template.heading, self.page.heading)

    def test_create_with_page_pk_raises_error_when_page_missing(self):
        template_data = {
            "page_pk": self.page.pk,
            "name": "My New Template",
            "organization": self.organization.pk,
        }
        serializer = self.serializer(data=template_data)
        self.assertTrue(serializer.is_valid())
        self.page.delete()
        with self.assertRaises(serializers.ValidationError) as v_error:
            new_template = serializer.save()
        self.assertIn("page", v_error.exception.detail)
        self.assertEqual(str(v_error.exception.detail["page"][0]), "This page no longer exists")

    def test_serializer_does_not_require_org(self):
        """
        The organization associated with newly created templates is derived from the originating page.
        Adding it to the serializer here would require it as a request parameter.
        """
        template_data = {
            "page_pk": self.page.pk,
            "name": "My New Template",
        }
        serializer = self.serializer(data=template_data)
        self.assertTrue(serializer.is_valid())


class StyleListSerializerTest(APITestCase):
    def setUp(self):
        self.rev_program = RevenueProgramFactory()
        self.style_1 = StyleFactory(revenue_program=self.rev_program)
        self.style_2 = StyleFactory(revenue_program=self.rev_program)
        self.donation_page_live = DonationPageFactory(
            published_date=timezone.now(), styles=self.style_1, revenue_program=self.rev_program
        )
        self.donation_page_unlive = DonationPageFactory(styles=self.style_2, revenue_program=self.rev_program)
        self.serializer = StyleListSerializer
        self.other_rev_program = RevenueProgramFactory()
        valid_styles_json = {}
        for k, v in required_style_keys.items():
            valid_styles_json[k] = v()
        self.updated_styled_data = {
            "name": "New Test Styles",
            "revenue_program": {"name": self.rev_program.name, "slug": self.rev_program.slug},
            **valid_styles_json,
        }

    def test_get_used_live(self):
        live_style_serializer = self.serializer(self.style_1)
        nonlive_style_serializer = self.serializer(self.style_2)

        self.assertIn("used_live", live_style_serializer.data)
        self.assertTrue(live_style_serializer.data["used_live"])
        self.assertIn("used_live", nonlive_style_serializer.data)
        self.assertFalse(nonlive_style_serializer.data["used_live"])
