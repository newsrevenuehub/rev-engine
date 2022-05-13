from re import A, M, template

from django.conf import settings
from django.utils import timezone

from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail
from rest_framework.test import APIRequestFactory, APITestCase

from apps.api.tests import RevEngineApiAbstractTestCase
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


class DonationPageFullDetailSerializerTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        self.set_up_domain_model()
        self.page = self.org1_rp1.donationpage_set.first()

        # set up benefits
        self.benefit_1 = BenefitFactory(organization=self.org1)
        self.benefit_2 = BenefitFactory(organization=self.org1)
        self.benefit_level_1 = BenefitLevelFactory(organization=self.org1)
        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_1, order=1)
        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_1, benefit=self.benefit_2, order=2)
        self.benefit_level_2 = BenefitLevelFactory(organization=self.org1)
        BenefitLevelBenefit.objects.create(benefit_level=self.benefit_level_2, benefit=self.benefit_1, order=1)
        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.page.revenue_program, benefit_level=self.benefit_level_1, level=1
        )
        RevenueProgramBenefitLevel.objects.create(
            revenue_program=self.page.revenue_program, benefit_level=self.benefit_level_2, level=2
        )

        self.serializer = DonationPageFullDetailSerializer
        self.request_factory = APIRequestFactory()

    def test_has_analytics_data(self):
        serializer = self.serializer(self.page)
        data = serializer.data
        for key in (
            "google_analytics_v3_domain",
            "google_analytics_v3_id",
            "google_analytics_v4_id",
            "facebook_pixel_id",
        ):

            self.assertEqual(data["revenue_program"][key], getattr(self.page.revenue_program, key))

    def test_get_benefit_levels(self):
        serializer = self.serializer(self.page)
        data = serializer.data

        # Should have the right amount of benefit levels...
        self.assertEqual(len(data["benefit_levels"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["name"], self.benefit_level_1.name)

        # Benefit level should have the right number of benefits...
        self.assertEqual(len(data["benefit_levels"][0]["benefits"]), 2)
        # ...and they should be in the right order.
        self.assertEqual(data["benefit_levels"][0]["benefits"][0]["name"], self.benefit_1.name)

    def test_get_organization_is_nonprofit(self):
        # Set it true, expect it in page serializer
        self.org1.non_profit = True
        self.org1.save()
        self.org1.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], True)

        # Set it false, expect it in page serializer
        self.org1.non_profit = False
        self.org1.save()
        self.org1.refresh_from_db()
        serializer = self.serializer(self.page)
        data = serializer.data
        self.assertEqual(data["organization_is_nonprofit"], False)

    def test_check_against_soft_deleted_slugs(self):
        validated_data = {settings.PAGE_SLUG_PARAM: self.page.slug}
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
            "revenue_program": self.page.revenue_program.pk,
        }
        serializer = self.serializer(data=new_page_data)
        request = self.request_factory.post("/")
        request.user = self.org_user
        serializer.context["request"] = request

        self.assertTrue(serializer.is_valid())
        new_page = serializer.save()
        self.assertEqual(new_page.heading, template.heading)

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


class TemplateDetailSerializerTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        self.set_up_domain_model()
        self.page = self.org1_rp1.donationpage_set.first()
        self.template = TemplateFactory(revenue_program=self.org1_rp1)
        self.serializer = TemplateDetailSerializer
        request = APIRequestFactory()
        request.user = self.org_user
        self.request = request

    def test_create_with_page_pk_uses_page_as_template(self):
        template_data = {
            "page": self.page.pk,
            "name": "My New Template",
        }
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertTrue(serializer.is_valid())
        new_template = serializer.save()
        self.assertEqual(new_template.heading, self.page.heading)

    def test_when_no_reference_to_page(self):
        template_data = {
            "name": "My New Template",
            "heading": "My heading",
        }
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertTrue(serializer.is_valid())
        new_template = serializer.save()
        for key, val in template_data.items():
            self.assertEqual(getattr(new_template, key), val)

    def test_when_reference_revenue_program_in_and_no_page(self):
        template_data = {"name": "my template name", "revenue_program": self.org1_rp1.pk}
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertTrue(serializer.is_valid())
        new_template = serializer.save()
        self.assertEqual(new_template.revenue_program.pk, template_data["revenue_program"])

    def test_when_reference_revenue_program_and_page_where_rp_is_not_pages_rp(self):
        self.assertNotEqual(self.page.revenue_program, self.org1_rp2)
        template_data = {
            "name": "my template name",
            "revenue_program": self.org1_rp2.pk,
            "page": self.page.pk,
        }
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertTrue(serializer.is_valid())
        new_template = serializer.save()
        self.assertEqual(new_template.revenue_program.pk, template_data["revenue_program"])
        self.assertEqual(new_template.name, template_data["name"])
        self.assertEqual(new_template.heading, self.page.heading)

    def test_serializer_is_invalid_when_referenced_page_not_found(self):
        template_data = {
            "page": self.page.pk,
            "name": "My New Template",
        }
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertTrue(serializer.is_valid())
        page_pk = self.page.pk
        self.page.delete()
        # NB, serializer must be reinitialized after deleting page, otherwise `is_valid` will
        # not cause validation to be run anew
        serializer = self.serializer(data=template_data, context={"request": self.request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("page", serializer.errors)
        self.assertIsInstance(serializer.errors["page"][0], ErrorDetail)
        self.assertEqual(str(serializer.errors["page"][0]), f'Invalid pk "{page_pk}" - object does not exist.')


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
