import json
from dataclasses import asdict

from django.utils import timezone

import pytest
import pytest_cases
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG
from apps.organizations.models import CorePlan, FiscalStatusChoices, FreePlan, Plans, PlusPlan
from apps.organizations.serializers import PaymentProviderSerializer
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.defaults import BENEFITS, SWAG, get_default_page_elements
from apps.pages.models import DonationPage, Style
from apps.pages.serializers import LOCALE_MAP, DonationPageFullDetailSerializer, StyleListSerializer
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
            "header_logo_alt_text",
            "heading",
            "id",
            "locale",
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
    @pytest.mark.parametrize("locale", LOCALE_MAP.values())
    def test_plan_page_limits_are_respected(self, plan, locale, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(org.plan.page_limit, revenue_program=rp, locale=locale.code)
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
                "locale": locale.code,
            }
        )
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer.context["request"] = request
        assert serializer.is_valid() is False
        assert str(serializer.errors["non_field_errors"][0]) == (
            f"Your organization has reached its limit of {org.plan.page_limit} {locale.adjective} pages"
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
    @pytest.mark.parametrize(
        "locale",
        LOCALE_MAP.values(),
    )
    def test_validate_publish_limit(self, plan, locale, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(
            org.plan.page_limit - 1, revenue_program=rp, published_date=timezone.now(), locale=locale.code
        )
        for dp in DonationPage.objects.filter(revenue_program=rp, locale=locale.code).all()[: org.plan.page_limit]:
            dp.published_date = timezone.now()
            dp.save()
        request = APIRequestFactory().post("/")
        request.user = hub_admin_user
        serializer = DonationPageFullDetailSerializer(
            data={
                "slug": "my-new-page",
                "revenue_program": rp.pk,
                "published_date": timezone.now(),
                "locale": locale.code,
            },
            context={"request": request},
        )
        assert serializer.is_valid() is False
        assert (
            str(serializer.errors["non_field_errors"][0])
            == f"Your organization has reached its limit of {org.plan.publish_limit} published {locale.adjective} page{'' if org.plan.publish_limit == 1 else 's'}"
        )

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.CORE.value))
    @pytest.mark.parametrize("locale", LOCALE_MAP.values())
    def test_validate_publish_limit_when_patching(self, plan, locale, hub_admin_user):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        DonationPageFactory.create_batch(
            org.plan.page_limit - 1, revenue_program=rp, published_date=timezone.now(), locale=locale.code
        )
        for dp in DonationPage.objects.filter(revenue_program=rp, locale=locale.code).all()[: org.plan.publish_limit]:
            dp.published_date = timezone.now()
            dp.save()
        request = APIRequestFactory().patch("/")
        request.user = hub_admin_user
        serializer = DonationPageFullDetailSerializer(
            data={
                "published_date": timezone.now(),
                "revenue_program": rp.pk,
                "slug": "my-new-page",
                "locale": locale.code,
            },
            context={"request": request},
            instance=DonationPage.objects.filter(published_date__isnull=True, locale=locale.code).first(),
        )
        assert serializer.is_valid() is False
        assert (
            str(serializer.errors["non_field_errors"][0])
            == f"Your organization has reached its limit of {org.plan.publish_limit} published {locale.adjective} page{'' if org.plan.publish_limit == 1 else 's'}"
        )

    @pytest_cases.parametrize(
        "instance,expect",
        (
            # has instance and id
            (pytest_cases.fixture_ref("live_donation_page"), False),
            # has instance but no id
            (DonationPage(), True),
            (None, True),
        ),
    )
    def test_is_new(self, instance, expect):
        serializer = DonationPageFullDetailSerializer(instance=instance)
        assert serializer.is_new is expect

    @pytest.mark.parametrize(
        "val,expect_valid",
        (
            ({"slug": "my-new-page"}, True),
            ({"slug": ""}, False),
            ({"slug": None}, False),
            ({}, False),
        ),
    )
    def test_ensure_slug_for_publication_when_new(self, val, expect_valid):
        serializer = DonationPageFullDetailSerializer()
        if expect_valid:
            assert serializer.ensure_slug_for_publication(val) is None
        else:
            with pytest.raises(serializers.ValidationError):
                serializer.ensure_slug_for_publication(val)

    @pytest.mark.parametrize(
        ("slug_on_instance", "data", "expect_valid"),
        (
            ("my-new-page", {}, True),
            ("my-old-slug", {"slug": "my-new-slug"}, True),
            ("my-new-page", {"slug": None}, False),
            ("my-new-page", {"slug": ""}, False),
            (None, {"slug": "my-new-page"}, True),
            (None, {"slug": None}, False),
            (None, {"slug": ""}, False),
            (None, {}, False),
        ),
    )
    def test_ensure_slug_for_publication_when_instance_no_slug_in_data(
        self, slug_on_instance, data, expect_valid, live_donation_page
    ):
        live_donation_page.slug = slug_on_instance
        serializer = DonationPageFullDetailSerializer(instance=live_donation_page)
        if expect_valid:
            assert serializer.ensure_slug_for_publication(data) is None
        else:
            with pytest.raises(serializers.ValidationError):
                serializer.ensure_slug_for_publication(data)

    @pytest.mark.parametrize(
        "val",
        # NB: the only expect types that would make it to this validator are None or str
        # but we add the additional cases here to be thorough
        (1, 1.0, True, False, [], {}, set(), tuple(), object()),
    )
    def test_validate_slug_when_not_string(self, val, mocker):
        mock_deny_list_validator = mocker.patch("apps.config.validators.validate_slug_against_denylist")
        assert DonationPageFullDetailSerializer().validate_slug(val) == val
        mock_deny_list_validator.assert_not_called()

    def test_validate_slug_when_invalid_because_empty_string(self):
        serializer = DonationPageFullDetailSerializer()
        with pytest.raises(serializers.ValidationError) as exc:
            serializer.validate_slug("")
        assert str(exc.value.detail[0]) == "This field may not be blank."

    def test_validate_slug_when_invalid_because_denied_word(self):
        DenyListWordFactory(word=(word := "foo"))
        serializer = DonationPageFullDetailSerializer()
        with pytest.raises(serializers.ValidationError) as exc:
            serializer.validate_slug(word)
        assert str(exc.value.detail[0]) == GENERIC_SLUG_DENIED_MSG

    def test_ensure_slug_is_unique_for_rp_when_data_not_have_slug_field(self):
        serializer = DonationPageFullDetailSerializer()
        assert serializer.ensure_slug_is_unique_for_rp({}) is None

    def test_ensure_slug_when_sent_value_is_none(self):
        serializer = DonationPageFullDetailSerializer()
        assert serializer.ensure_slug_is_unique_for_rp({"slug": None}) is None

    def test_ensure_slug_when_new_and_non_unique(self, live_donation_page):
        serializer = DonationPageFullDetailSerializer()
        with pytest.raises(serializers.ValidationError) as exc:
            serializer.ensure_slug_is_unique_for_rp(
                {"slug": live_donation_page.slug, "revenue_program": live_donation_page.revenue_program}
            )
        assert (
            str(exc.value.detail["slug"]) == f"Value must be unique and '{live_donation_page.slug}' is already in use"
        )

    def test_ensure_slug_when_not_new_and_non_unique(self, live_donation_page):
        page = DonationPageFactory(revenue_program=live_donation_page.revenue_program)
        serializer = DonationPageFullDetailSerializer(instance=page)
        with pytest.raises(serializers.ValidationError) as exc:
            serializer.ensure_slug_is_unique_for_rp({"slug": live_donation_page.slug})
        assert (
            str(exc.value.detail["slug"]) == f"Value must be unique and '{live_donation_page.slug}' is already in use"
        )

    @pytest.mark.parametrize(
        "locale_code",
        LOCALE_MAP.keys(),
    )
    @pytest.mark.parametrize("plan", (FreePlan, CorePlan, PlusPlan))
    @pytest.mark.parametrize("request_method", ("POST", "PATCH"))
    def test_validate_page_limit(self, locale_code, plan, request_method, revenue_program):
        revenue_program.organization.plan_name = plan.name
        revenue_program.organization.save()
        DonationPageFactory.create_batch(
            plan.page_limit,
            revenue_program=revenue_program,
            locale=locale_code,
        )
        data = {"revenue_program": revenue_program, "locale": locale_code}
        request = getattr(APIRequestFactory(), request_method.lower())("/")
        serializer = DonationPageFullDetailSerializer(context={"request": request})
        if request_method != "POST":
            assert serializer.validate_page_limit(data) is None
        else:
            with pytest.raises(serializers.ValidationError):
                serializer.validate_page_limit(data)

    def test_validate_locale_when_unexpected_value(self):
        serializer = DonationPageFullDetailSerializer()
        with pytest.raises(serializers.ValidationError):
            serializer.validate_locale("foo")


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

    def test_validate_revenue_program(self):
        serializer = StyleListSerializer()
        with pytest.raises(serializers.ValidationError) as exc:
            serializer.validate_revenue_program(None)
        assert str(exc.value.detail[0]) == "This field is required."
