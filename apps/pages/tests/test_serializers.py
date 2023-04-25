import json
from dataclasses import asdict

from django.utils import timezone

import pytest
import pytest_cases
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.organizations.models import FiscalStatusChoices, FreePlan, Plans
from apps.organizations.serializers import PaymentProviderSerializer
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.defaults import BENEFITS, SWAG, get_default_page_elements
from apps.pages.models import DonationPage, Style
from apps.pages.serializers import DonationPageFullDetailSerializer, StyleListSerializer
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.models import Roles
from apps.users.tests.factories import create_test_user


@pytest.mark.django_db
class TestDonationPageFullDetailSerializer:
    def test_has_expected_fields(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        expected_first_level_keys = {
            "allow_offer_nyt_comp",
            "benefit_levels",
            "created",
            "currency",
            "elements",
            "graphic_thumbnail",
            "graphic",
            "header_bg_image_thumbnail",
            "header_bg_image",
            "header_link",
            "header_logo_thumbnail",
            "header_logo",
            "heading",
            "id",
            "modified",
            "name",
            "page_screenshot",
            "payment_provider",
            "plan",
            "post_thank_you_redirect",
            "published_date",
            "revenue_program_country",
            "revenue_program_is_nonprofit",
            "revenue_program",
            "sidebar_elements",
            "slug",
            "stripe_account_id",
            "styles",
            "thank_you_redirect",
        }
        assert set(serializer.data.keys()) == expected_first_level_keys
        plan_keys = set(asdict(FreePlan).keys())
        assert plan_keys == serializer.data["plan"].keys()

    def test_create_creates_name_on_fly_when_not_provided(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.PLUS
        revenue_program.organization.save()
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serialized = DonationPageFullDetailSerializer(
            data={"revenue_program": revenue_program.pk, "slug": "my-new-page"}
        )
        serialized.context["request"] = request
        assert serialized.is_valid()
        page = serialized.save()
        assert page.name == revenue_program.name

        serialized = DonationPageFullDetailSerializer(
            data={"revenue_program": revenue_program.pk, "slug": "something-else"}
        )
        serialized.context["request"] = request
        assert serialized.is_valid()
        page = serialized.save()
        assert page.name == f"{revenue_program.name}1"

    def test_create_page_has_default_elements_when_none_provided(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.PLUS
        revenue_program.organization.save()
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serialized = DonationPageFullDetailSerializer(
            data={"revenue_program": revenue_program.pk, "slug": "my-new-page"}
        )
        serialized.context["request"] = request
        assert serialized.is_valid()
        page = serialized.save()
        assert set([x["type"] for x in page.elements]) == set([x["type"] for x in get_default_page_elements()])

    def test_create_with_permitted_free_plan_page_elements(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.FREE
        revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/free-plan-page-elements.json") as fl:
            page_elements = json.load(fl)
        data = {
            "slug": "my-new-page",
            "revenue_program": revenue_program.pk,
            "elements": page_elements,
        }
        serializer = DonationPageFullDetailSerializer(data=data)
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid()

    def test_create_with_permitted_free_plan_sidebar_elements(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.FREE
        revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/free-plan-sidebar-elements.json") as fl:
            sidebar_elements = json.load(fl)
        data = {
            "slug": "my-new-page",
            "revenue_program": revenue_program.pk,
            "sidebar_elements": sidebar_elements,
        }
        serializer = DonationPageFullDetailSerializer(data=data)
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid()

    def test_create_with_unpermitted_free_plan_page_elements(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.FREE
        revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/plus-plan-page-elements.json") as fl:
            page_elements = json.load(fl)
        data = {
            # name is autogenerated from RevenueProgram.
            "slug": "my-new-page",
            "revenue_program": revenue_program.pk,
            "elements": page_elements,
        }
        serializer = DonationPageFullDetailSerializer(data=data)
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is False
        assert str(serializer.errors["page_elements"][0]) == "You're not allowed to use the following elements: DSwag"

    def test_create_with_unpermitted_free_plan_sidebar_elements(self, revenue_program, hub_admin_user):
        revenue_program.organization.plan_name = Plans.FREE
        revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/plus-plan-sidebar-elements.json") as fl:
            sidebar_elements = json.load(fl)
        data = {
            # name is autogenerated from RevenueProgram.
            "slug": "my-new-page",
            "revenue_program": revenue_program.pk,
            "sidebar_elements": sidebar_elements,
        }
        serializer = DonationPageFullDetailSerializer(data=data)
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is False
        assert (
            str(serializer.errors["sidebar_elements"][0])
            == "You're not allowed to use the following elements: DBenefits"
        )

    def test_update(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer()
        dp = serializer.update(live_donation_page, {"name": (new_name := "changed")})
        assert isinstance(dp, DonationPage)
        assert dp.name == new_name
        live_donation_page.refresh_from_db()
        assert live_donation_page.name == new_name

    def test_update_with_style(self, live_donation_page):
        (rp := live_donation_page.revenue_program).organization.plan_name = Plans.PLUS
        rp.organization.save()
        serializer = DonationPageFullDetailSerializer()
        style = StyleFactory(revenue_program=rp)
        assert style != live_donation_page.styles
        dp = serializer.update(live_donation_page, {"styles_pk": style.pk})
        assert isinstance(dp, DonationPage)
        live_donation_page.refresh_from_db()
        assert live_donation_page.styles == style

    def test_update_remove_style(self, hub_admin_user, live_donation_page):
        live_donation_page.revenue_program.organization.plan_name = Plans.PLUS
        live_donation_page.revenue_program.organization.save()
        live_donation_page.styles = StyleFactory(revenue_program=live_donation_page.revenue_program)
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        dp = serializer.update(live_donation_page, {"styles_pk": None})
        assert isinstance(dp, DonationPage)
        live_donation_page.refresh_from_db()
        assert live_donation_page.styles is None
        assert dp.styles is None

    def test_update_referenced_style_is_missing(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        assert not Style.objects.filter(pk=(pk := "2132423")).exists()
        with pytest.raises(serializers.ValidationError) as e:
            serializer.update(live_donation_page, {"styles_pk": pk})
            assert "Could not find Style" in str(e)

    def test_payment_provider(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        assert (
            serializer.data["payment_provider"]
            == PaymentProviderSerializer(live_donation_page.revenue_program.payment_provider).data
        )

    def test_serializer_not_broken_by_no_payment_provider(self, live_donation_page):
        live_donation_page.revenue_program.payment_provider.delete()
        live_donation_page.refresh_from_db()
        DonationPageFullDetailSerializer(instance=live_donation_page).data

    def test_has_analytics_data(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        for key in (
            "google_analytics_v3_domain",
            "google_analytics_v3_id",
            "google_analytics_v4_id",
            "facebook_pixel_id",
        ):
            assert serializer.data["revenue_program"][key] == getattr(live_donation_page.revenue_program, key)

    def test_get_benefit_levels(self, live_donation_page):
        BenefitLevelFactory.create_batch(2, revenue_program=live_donation_page.revenue_program)
        live_donation_page.revenue_program.refresh_from_db()
        assert live_donation_page.revenue_program.benefitlevel_set.count() == 2
        serializer = DonationPageFullDetailSerializer(live_donation_page)
        assert len(serializer.data["benefit_levels"]) == 2
        live_donation_page.revenue_program.benefitlevel_set.all().delete()
        serializer = DonationPageFullDetailSerializer(live_donation_page)
        assert len(serializer.data["benefit_levels"]) == 0

    @pytest.mark.parametrize(
        "fiscal_status,expect",
        (
            (FiscalStatusChoices.NONPROFIT, True),
            (FiscalStatusChoices.FOR_PROFIT, False),
            (FiscalStatusChoices.FISCALLY_SPONSORED, True),
        ),
    )
    def test_get_revenue_program_is_nonprofit(self, fiscal_status, expect, live_donation_page):
        live_donation_page.revenue_program.fiscal_status = fiscal_status
        live_donation_page.revenue_program.save()
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        assert serializer.data["revenue_program_is_nonprofit"] == expect

    # TODO: [DEV-2187] Remove stripe_account_id from DonationPageFullDetailSerializer
    def test_live_context_adds_org_stripe_account_id(self, live_donation_page):
        assert live_donation_page.revenue_program.payment_provider.stripe_account_id is not None
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page, context={"live": False})
        assert serializer.data["stripe_account_id"] is None

        serializer = DonationPageFullDetailSerializer(instance=live_donation_page, context={"live": True})
        assert (
            serializer.data["stripe_account_id"]
            == live_donation_page.revenue_program.payment_provider.stripe_account_id
        )

    def test_not_live_context_adds_allow_offer_nyt_comp(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page, context={"live": True})
        assert serializer.data["allow_offer_nyt_comp"] is None
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page, context={"live": False})
        assert serializer.data["allow_offer_nyt_comp"] == live_donation_page.revenue_program.allow_offer_nyt_comp

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.PLUS.value, Plans.CORE.value))
    def test_can_create_under_page_limit(self, plan, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(org.plan.page_limit - 1, revenue_program=rp)
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
            }
        )
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is True

    # Skipping Plus plan because it's meant to have unlimited published pages.
    @pytest_cases.parametrize("plan", (Plans.CORE.value, Plans.CORE.value))
    def test_can_create_when_at_publish_limit(self, plan, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        print(org.plan.name, org.plan.publish_limit, org.plan.page_limit)
        DonationPageFactory.create_batch(org.plan.publish_limit, published_date=timezone.now(), revenue_program=rp)
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
            }
        )
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is True

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.PLUS.value, Plans.CORE.value))
    def test_plan_page_limits_are_respected(self, plan, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(org.plan.page_limit, revenue_program=rp)
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
            }
        )
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is False
        assert str(serializer.errors["non_field_errors"][0]) == (
            f"Your organization has reached its limit of {org.plan.page_limit} pages"
        )

    def test_cannot_set_thank_you_redirect_when_plan_not_enabled(self, live_donation_page, hub_admin_user):
        live_donation_page.revenue_program.organization.plan_name = Plans.FREE
        (org := live_donation_page.revenue_program.organization).save()
        assert not org.plan.custom_thank_you_page_enabled
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": live_donation_page.revenue_program.pk,
                "thank_you_redirect": "https://www.somewhere.com",
            },
            context={"request": request},
        )
        assert serializer.is_valid() is False
        assert str(serializer.errors["thank_you_redirect"][0]) == (
            "This organization's plan does not enable assigning a custom thank you URL"
        )

    def test_can_set_thank_you_redirect_when_plan_enabled(self, hub_admin_user):
        org = OrganizationFactory(plan_name=Plans.PLUS)
        rp = RevenueProgramFactory(organization=org)
        assert org.plan.custom_thank_you_page_enabled is True
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        redirect_url = "https://www.somewhere.com"
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
                "thank_you_redirect": (redirect_url := "https://www.somewhere.com"),
            },
            context={"request": request},
        )
        assert serializer.is_valid() is True
        page = serializer.save()
        assert serializer.data["thank_you_redirect"] == redirect_url
        assert page.thank_you_redirect == redirect_url

    def test_unpermitted_page_elements_are_not_returned(self, live_donation_page):
        live_donation_page.revenue_program.organization.plan_name = Plans.FREE
        live_donation_page.revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/plus-plan-page-elements.json") as fl:
            live_donation_page.page_elements = json.load(fl)
        live_donation_page.save()
        assert SWAG in [elem["type"] for elem in live_donation_page.page_elements]
        assert SWAG not in FreePlan.page_elements
        serialized = DonationPageFullDetailSerializer(instance=live_donation_page)
        assert SWAG not in [elem["type"] for elem in serialized.data["elements"]]
        assert len(serialized.data["elements"]) == len(live_donation_page.page_elements) - 1

    def test_unpermitted_sidebar_elements_are_not_returned(self, live_donation_page):
        live_donation_page.revenue_program.organization.plan_name = Plans.FREE
        live_donation_page.revenue_program.organization.save()
        with open("apps/pages/tests/fixtures/plus-plan-sidebar-elements.json") as fl:
            live_donation_page.sidebar_elements = json.load(fl)
        live_donation_page.save()
        assert BENEFITS in [elem["type"] for elem in live_donation_page.sidebar_elements]
        assert BENEFITS not in FreePlan.sidebar_elements
        serialized = DonationPageFullDetailSerializer(instance=live_donation_page)
        assert BENEFITS not in [elem["type"] for elem in serialized.data["sidebar_elements"]]
        assert len(serialized.data["sidebar_elements"]) == len(live_donation_page.sidebar_elements) - 1

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.CORE.value))
    def test_validate_publish_limit(self, plan, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(org.plan.page_limit - 1, revenue_program=rp, published_date=timezone.now())
        for dp in DonationPage.objects.filter(revenue_program=rp).all()[: org.plan.page_limit]:
            dp.published_date = timezone.now()
            dp.save()
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
                "published_date": timezone.now(),
            },
            context={"request": request},
        )
        assert serializer.is_valid() is False
        assert (
            str(serializer.errors["non_field_errors"][0])
            == f"Your organization has reached its limit of {org.plan.publish_limit} published page{'' if org.plan.publish_limit == 1 else 's'}"
        )


@pytest.mark.django_db
class TestStyleListSerializer:
    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.PLUS.value, Plans.CORE.value))
    def test_plan_style_limits_are_respected(self, plan):
        org = OrganizationFactory(plan_name=plan)
        rev_program = RevenueProgramFactory(organization=org)
        StyleFactory.create_batch(org.plan.style_limit, revenue_program=rev_program)
        serializer = StyleListSerializer(
            data={
                "name": "my-new-page",
                "revenue_program": rev_program.pk,
                "radii": [],
                "font": {},
                "fontSizes": [],
            }
        )
        request_factory = APIRequestFactory()
        request = request_factory.post("/")
        request.user = create_test_user(role_assignment_data={"role_type": Roles.ORG_ADMIN, "organization": org})
        serializer.context["request"] = request
        assert serializer.is_valid() is False
        assert str(serializer.errors["non_field_errors"][0]) == (
            f"Your organization has reached its limit of {org.plan.style_limit} style{'' if org.plan.style_limit == 1 else 's'}"
        )

    @pytest.mark.parametrize("published", (True, False))
    def test_get_used_live(self, published):
        # this removes restrictions on number of styles, which would get triggered in validation otherwis
        org = OrganizationFactory(plan_name=Plans.PLUS.value)
        page = DonationPageFactory(
            published_date=timezone.now() if published else None, revenue_program__organization=org
        )
        page.styles = StyleFactory(revenue_program=page.revenue_program)
        page.save()
        assert StyleListSerializer(page.styles).data["used_live"] is published
