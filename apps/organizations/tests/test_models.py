from dataclasses import asdict
from datetime import timedelta
from random import choice, randint
from unittest.mock import Mock

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import override_settings
from django.utils import timezone

import faker
import pytest
import pytest_cases
from mailchimp_marketing.api_client import ApiClientError
from stripe import ApplePayDomain
from stripe.error import StripeError

import apps
from apps.common.models import SocialMeta
from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.models import (
    RP_SLUG_MAX_LENGTH,
    UNLIMITED_CEILING,
    Benefit,
    BenefitLevel,
    BenefitLevelBenefit,
    CorePlan,
    FiscalStatusChoices,
    FreePlan,
    HubDefaultEmailStyle,
    MailchimpEmailList,
    MailchimpIntegrationError,
    MailchimpProduct,
    MailchimpRateLimitError,
    MailchimpSegment,
    MailchimpStore,
    Message,
    Organization,
    PaymentProvider,
    Plans,
    PlusPlan,
    RevenueProgram,
    TransactionalEmailStyle,
    logger,
)
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.defaults import (
    BENEFITS,
    DEFAULT_PERMITTED_PAGE_ELEMENTS,
    DEFAULT_PERMITTED_SIDEBAR_ELEMENTS,
    SWAG,
)
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.models import RoleAssignment, Roles, User


fake = faker.Faker()


class TestPlans:
    def test_has_expected_plans(self):
        assert set(Plans) == {Plans.FREE, Plans.CORE, Plans.PLUS}

    def test_free_plan_characteristics(self):
        assert asdict(FreePlan) == {
            "name": "FREE",
            "label": "Free",
            "page_limit": 2,
            "style_limit": 1,
            "custom_thank_you_page_enabled": False,
            "sidebar_elements": DEFAULT_PERMITTED_SIDEBAR_ELEMENTS,
            "page_elements": DEFAULT_PERMITTED_PAGE_ELEMENTS,
            "publish_limit": 1,
        }

    def test_plus_plan_characteristics(self):
        assert asdict(PlusPlan) == {
            "name": "PLUS",
            "label": "Plus",
            "page_limit": UNLIMITED_CEILING,
            "style_limit": UNLIMITED_CEILING,
            "custom_thank_you_page_enabled": True,
            "sidebar_elements": DEFAULT_PERMITTED_SIDEBAR_ELEMENTS + [BENEFITS],
            "page_elements": DEFAULT_PERMITTED_PAGE_ELEMENTS + [SWAG],
            "publish_limit": UNLIMITED_CEILING,
        }

    def test_core_plan_characteristics(self):
        assert asdict(CorePlan) == {
            "name": "CORE",
            "label": "Core",
            "page_limit": 5,
            "style_limit": UNLIMITED_CEILING,
            "custom_thank_you_page_enabled": True,
            "sidebar_elements": DEFAULT_PERMITTED_SIDEBAR_ELEMENTS + [BENEFITS],
            "page_elements": DEFAULT_PERMITTED_PAGE_ELEMENTS + [SWAG],
            "publish_limit": 2,
        }

    @pytest.mark.parametrize(
        "plan_name,expected_plan",
        (
            (FreePlan.name, FreePlan),
            (CorePlan.name, CorePlan),
            (PlusPlan.name, PlusPlan),
            ("not-found-name", None),
        ),
    )
    def test_get_plan(self, plan_name, expected_plan):
        assert Plans.get_plan(plan_name) == expected_plan


@pytest.mark.django_db
class TestOrganization:
    def test_has_expected_plans(self):
        assert set(Organization.plan_name.field.choices) == {
            (Plans.FREE.value, Plans.FREE.label),
            (Plans.CORE.value, Plans.CORE.label),
            (Plans.PLUS.value, Plans.PLUS.label),
        }

    def test_basics(self):
        t = Organization()
        str(t)
        assert isinstance(t.admin_revenueprogram_options, list)

    def test_user_is_member(self):
        user = User.objects.create()
        t = Organization.objects.create()
        assert not t.user_is_member(user)
        t.users.add(user)
        assert t.user_is_member(user)

    def test_user_is_owner(self):
        user = User.objects.create()
        t = Organization.objects.create()
        assert not t.user_is_owner(user)

    def test_admin_revenue_program_options(self, revenue_program):
        assert revenue_program.organization.admin_revenueprogram_options == [(revenue_program.name, revenue_program.pk)]

    def test_org_cannot_be_deleted_when_contributions_downstream(self, live_donation_page, one_time_contribution):
        """An org should not be deleteable when downstream contributions exist"""
        one_time_contribution.donation_page = live_donation_page
        one_time_contribution.save()
        with pytest.raises(ProtectedError) as protected_error:
            live_donation_page.revenue_program.organization.delete()
            assert protected_error.exception.args[0] == (
                "Cannot delete some instances of model 'Organization' because they are referenced through protected "
                "foreign keys: 'RevenueProgram.organization'."
            )
        assert Organization.objects.filter(pk=live_donation_page.revenue_program.organization.pk).exists()

    def test_org_deletion_cascades_when_no_contributions_downstream(self, org_user_free_plan, live_donation_page):
        """An org and its cascading relationships should be deleted when no downstream contributions"""
        live_donation_page.revenue_program = org_user_free_plan.roleassignment.revenue_programs.first()
        live_donation_page.save()
        page_id = live_donation_page.id
        rp_ids = org_user_free_plan.roleassignment.revenue_programs.values_list("id", flat=True)
        ra_id = org_user_free_plan.roleassignment.id
        org_user_free_plan.roleassignment.organization.delete()
        assert not RevenueProgram.objects.filter(pk__in=rp_ids).exists()
        assert not DonationPage.objects.filter(pk=page_id).exists()
        assert not RoleAssignment.objects.filter(pk=ra_id).exists()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_organization_filtered_by_role_assignment(self, user):
        # ensure there will be unowned organizations
        OrganizationFactory.create_batch(size=2)
        owned_orgs = (
            Organization.objects.all()
            if user.roleassignment.role_type == Roles.HUB_ADMIN
            else [
                user.roleassignment.organization,
            ]
        )
        query = Organization.objects.filtered_by_role_assignment(user.roleassignment)
        assert query.count() == len(owned_orgs)
        assert set(query.values_list("id", flat=True)) == set([x.id for x in owned_orgs])

    def test_organization_filtered_by_role_assignment_when_unexpected_role(self, user_with_unexpected_role):
        OrganizationFactory.create_batch(3)
        assert Organization.objects.filtered_by_role_assignment(user_with_unexpected_role.roleassignment).count() == 0


class TestBenefit:
    def test_basics(self):
        t = Benefit()
        str(t)


class TestBenefitLevel:
    def test_basics(self):
        t = BenefitLevel()
        str(t)

    def test_clean(self):
        t = BenefitLevel()
        t.clean()


class TestBenefitLevelBenefit:
    def test_basics(self):
        t = BenefitLevelBenefit(benefit=Benefit(), benefit_level=BenefitLevel(), order=1)
        str(t)


@pytest.fixture()
def revenue_program_with_no_default_donation_page():
    return RevenueProgramFactory(
        onboarded=True, default_donation_page=None, organization=OrganizationFactory(plus_plan=True)
    )


@pytest.fixture()
def revenue_program_with_default_donation_page_all_transactional_email_style_values():
    # need to guarantee we get a unique name property because otherwise a pre-existing style could be retrieved
    # and we want net new
    style = StyleFactory()
    style.styles = style.styles | {
        "colors": {
            "cstm_mainHeader": "#000000",
            "cstm_CTAs": "#000000",
        },
        "font": {"heading": "something", "body": "else"},
    }
    rp = RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(plus_plan=True))
    page = DonationPageFactory(revenue_program=rp, styles=style, header_logo=get_test_image_file_jpeg())
    assert page.header_logo is not None
    rp.default_donation_page = page
    return rp


@pytest_cases.fixture()
def revenue_program_with_default_donation_page_but_no_transactional_email_style_values():
    rp = RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(plus_plan=True))
    style = StyleFactory(name="foo", revenue_program=rp)
    style.styles.pop("colors", None)
    style.styles.pop("font", None)
    style.save()
    page = DonationPageFactory(revenue_program=rp, styles=style, header_logo=None)
    rp.default_donation_page = page
    rp.save()
    return rp


@pytest.mark.django_db
class TestRevenueProgram:
    def test_basics(self):
        t = RevenueProgram()
        str(t)

    def test_stripe_account_id(self):
        t = RevenueProgram()
        assert None is t.stripe_account_id

    def test_clean_fields(self):
        t = RevenueProgramFactory(name="B o %")
        t.clean_fields()
        assert "b-o" == t.slug
        # Branch coverage.
        t = RevenueProgramFactory()
        t.clean_fields()

    def test_clean(self):
        t = RevenueProgram()
        t.clean()

    def test_bad_default_page(self):
        # Avoid state of a rev program's default page not being one of "its pages"
        t = RevenueProgram()
        t.default_donation_page = apps.pages.models.DonationPage(revenue_program=t)
        t.clean()
        # Not set.
        with pytest.raises(apps.organizations.models.ValidationError):
            t.default_donation_page = apps.pages.models.DonationPage()
            t.clean()
        # Set to other RP
        with pytest.raises(apps.organizations.models.ValidationError):
            t.default_donation_page = apps.pages.models.DonationPage(revenue_program=RevenueProgram())
            t.clean()

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_stripe_create_apple_pay_domain_happy_path(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date is not None
        mock_stripe_create.assert_called_once_with(
            api_key="",
            domain_name=f"{rp.slug}.{settings.DOMAIN_APEX}",
            stripe_account=rp.payment_provider.stripe_account_id,
        )

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_stripe_create_apple_pay_domain_when_already_verified_date_exists(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        verified_date = timezone.now()
        rp = RevenueProgramFactory(domain_apple_verified_date=verified_date)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date == verified_date
        assert not mock_stripe_create.called

    @override_settings(STRIPE_LIVE_MODE=False)
    def test_stripe_create_apple_pay_domain_when_not_in_live_mode(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date is None
        assert not mock_stripe_create.called

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_apple_pay_domain_verification_when_stripe_error(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create", side_effect=StripeError)
        mock_logger = mocker.patch("apps.organizations.models.logger")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        mock_stripe_create.assert_called_once()
        mock_logger.exception.assert_called_once()

    @pytest.mark.parametrize("enabled", [True, False])
    def test_mailchimp_access_token(self, enabled, revenue_program, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = enabled
        mock_get_client = mocker.patch("apps.common.secrets.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = (val := b"something")
        assert revenue_program.mailchimp_access_token == (val.decode("utf-8") if enabled else None)

    def test_mailchimp_email_lists_property_happy_path(self, mailchimp_email_list_from_api, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        mock_get_client = mocker.patch("apps.common.secrets.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = b"something"
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix="something")
        mock_mc_client = mocker.patch("mailchimp_marketing.Client")
        return_val = {"lists": [mailchimp_email_list_from_api]}
        mock_mc_client.return_value.lists.get_all_lists.return_value = return_val
        assert revenue_program.mailchimp_email_lists == [MailchimpEmailList(**mailchimp_email_list_from_api)]

    def test_mailchimp_email_lists_property_when_integration_not_connected(self, mocker, revenue_program, settings):
        logger_spy = mocker.spy(logger, "debug")
        mock_mc_client = mocker.patch("mailchimp_marketing.Client")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_integration_connected",
            return_value=False,
            new_callable=mocker.PropertyMock,
        )
        assert revenue_program.mailchimp_email_lists == []
        mock_mc_client.assert_not_called()
        mock_mc_client.return_value.lists.get_all_lists.assert_not_called()
        assert logger_spy.call_args == mocker.call(
            "Mailchimp integration not connected for this revenue program (%s), returning empty list",
            revenue_program.id,
        )

    def test_mailchimp_email_lists_property_when_mailchimp_api_error(self, revenue_program, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_integration_connected",
            return_value=True,
            new_callable=mocker.PropertyMock,
        )
        mock_mc_client = mocker.patch("mailchimp_marketing.Client")
        mock_mc_client.return_value.lists.get_all_lists.side_effect = ApiClientError((error_text := "Ruh roh"))
        mock_mc_client.return_value.lists.get_all_lists.return_value = {"lists": [{"id": "123", "name": "test"}]}
        log_spy = mocker.spy(logger, "exception")
        assert revenue_program.mailchimp_email_lists == []
        log_spy.assert_called_once_with(
            "Failed to fetch email lists from Mailchimp for RP with ID %s mc server prefix %s. The error text is %s",
            revenue_program.id,
            revenue_program.mailchimp_server_prefix,
            error_text,
        )

    @pytest_cases.parametrize(
        "rp,make_expected_value_fn",
        (
            (
                pytest_cases.fixture_ref("revenue_program_with_no_default_donation_page"),
                lambda rp: HubDefaultEmailStyle,
            ),
            (
                pytest_cases.fixture_ref(
                    "revenue_program_with_default_donation_page_all_transactional_email_style_values"
                ),
                lambda rp: TransactionalEmailStyle(
                    is_default_logo=False,
                    logo_url=rp.default_donation_page.header_logo.url,
                    header_color=rp.default_donation_page.styles.styles["colors"]["cstm_mainHeader"],
                    header_font=rp.default_donation_page.styles.styles["font"]["heading"],
                    body_font=rp.default_donation_page.styles.styles["font"]["body"],
                    button_color=rp.default_donation_page.styles.styles["colors"]["cstm_CTAs"],
                ),
            ),
            (
                pytest_cases.fixture_ref(
                    "revenue_program_with_default_donation_page_but_no_transactional_email_style_values"
                ),
                lambda rp: TransactionalEmailStyle(
                    is_default_logo=True,
                    logo_url=HubDefaultEmailStyle.logo_url,
                    header_color=None,
                    header_font=None,
                    body_font=None,
                    button_color=None,
                ),
            ),
        ),
    )
    def test_transactional_email_style_property(self, rp, make_expected_value_fn):
        expected_value = make_expected_value_fn(rp)
        assert rp.transactional_email_style == expected_value

    def test_slug_created(self):
        assert RevenueProgramFactory().slug

    def test_slug_immutable(self, revenue_program):
        slug = revenue_program.slug
        revenue_program.name = "new name"
        revenue_program.save()
        revenue_program.refresh_from_db()
        assert revenue_program.slug == slug

    def test_slug_larger_than_max_length(self):
        assert len(RevenueProgramFactory(name="x" * (RP_SLUG_MAX_LENGTH + 1)).slug) < RP_SLUG_MAX_LENGTH

    def test_cannot_delete_when_downstream_contributions(self, live_donation_page, monkeypatch):
        # TODO: DEV-3026
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.fetch_stripe_payment_method", lambda *args, **kwargs: None
        )
        ContributionFactory(donation_page=live_donation_page)
        with pytest.raises(ProtectedError) as protected_error:
            live_donation_page.revenue_program.delete()
            assert protected_error.value.args[0] == (
                "Cannot delete some instances of model 'RevenueProgram' because they are referenced "
                "through protected foreign keys: 'DonationPage.revenue_program'."
            )

    def test_can_delete_when_no_downstream_contributions_and_cascades(self, live_donation_page):
        assert not Contribution.objects.filter(
            donation_page__revenue_program=live_donation_page.revenue_program
        ).exists()
        page_id = live_donation_page.id
        live_donation_page.revenue_program.delete()
        assert not DonationPage.objects.filter(id=page_id).exists()

    def test_delete_organization_deletes_revenue_program(self, live_donation_page):
        assert live_donation_page.revenue_program
        assert live_donation_page.revenue_program.organization
        rp_id = live_donation_page.revenue_program.id
        live_donation_page.revenue_program.organization.delete()
        assert not RevenueProgram.objects.filter(pk=rp_id).exists()

    def test_deleting_cascades_to_socialmeta(self, revenue_program):
        sm_id = SocialMeta.objects.create(
            title="title", description="description", url="https://example.com", revenue_program=revenue_program
        ).id
        revenue_program.delete()
        assert not SocialMeta.objects.filter(id=sm_id).exists()

    def test_format_twitter_handle(self, revenue_program):
        target_handle = "testing"
        revenue_program.twitter_handle = f"@{target_handle}"
        revenue_program.clean()
        assert revenue_program.twitter_handle == target_handle

    def test_apple_pay_domain_verification_not_called_when_created_and_not_live(self, mocker, settings):
        settings.STRIPE_LIVE_MODE = False
        spy = mocker.spy(ApplePayDomain, "create")
        RevenueProgramFactory()
        spy.assert_not_called()

    def test_apple_pay_domain_verification_not_called_when_updated_and_live(self, revenue_program, settings, mocker):
        settings.STRIPE_LIVE_MODE = True
        settings.STRIPE_LIVE_SECRET_KEY = "my_test_live_key"
        settings.DOMAIN_APEX = "testapexdomain.com"
        spy = mocker.spy(ApplePayDomain, "create")
        revenue_program.slug = "my-new-slug"
        revenue_program.save()
        spy.assert_not_called()

    def test_slug_validated_against_denylist(self, revenue_program):
        denied_word = DenyListWordFactory()
        revenue_program.slug = denied_word.word
        with pytest.raises(ValidationError) as validation_error:
            revenue_program.clean_fields()
            assert "slug" in validation_error.value.error_dict
            assert validation_error.value.error_dict["slug"][0].code == SLUG_DENIED_CODE
            assert validation_error.value.error_dict["slug"][0].message == GENERIC_SLUG_DENIED_MSG

    def test_admin_benefit_options(self, revenue_program):
        assert isinstance(revenue_program.admin_benefit_options, list)

    def test_admin_benefitlevel_options(self, revenue_program):
        assert isinstance(revenue_program.admin_benefitlevel_options, list)

    @pytest.mark.parametrize(
        "fiscal_status,fiscal_sponsor_name,non_profit_value",
        [
            (FiscalStatusChoices.FOR_PROFIT, None, False),
            (FiscalStatusChoices.NONPROFIT, None, True),
            (FiscalStatusChoices.FISCALLY_SPONSORED, "NRH", True),
        ],
    )
    def test_fiscal_status_on_revenue_program(self, fiscal_status, fiscal_sponsor_name, non_profit_value):
        rp = RevenueProgramFactory(organization=OrganizationFactory())
        rp.fiscal_status = fiscal_status
        rp.fiscal_sponsor_name = fiscal_sponsor_name
        assert rp.non_profit == non_profit_value

    @pytest.mark.parametrize(
        "fiscal_status,fiscal_sponsor_name",
        [
            (FiscalStatusChoices.FOR_PROFIT, "NRH"),
            (FiscalStatusChoices.NONPROFIT, "NRH"),
            (FiscalStatusChoices.FISCALLY_SPONSORED, None),
        ],
    )
    def test_fiscal_sponsor_name_clean(self, fiscal_status, fiscal_sponsor_name):
        rp = RevenueProgramFactory(organization=OrganizationFactory())
        rp.fiscal_status = fiscal_status
        rp.fiscal_sponsor_name = fiscal_sponsor_name
        with pytest.raises(ValidationError):
            rp.clean_fiscal_sponsor_name()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_filtered_by_role_assignment(self, user):
        # ensure unowned RevenuePrograms in case of org and RP user
        RevenueProgramFactory.create_batch(size=2)
        owned_rps = (
            RevenueProgram.objects.all()
            if user.roleassignment.role_type == Roles.HUB_ADMIN
            else RevenueProgram.objects.filter(id__in=user.roleassignment.revenue_programs.values_list("id", flat=True))
        )
        query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
        assert query.count() == len(owned_rps)
        assert set(query.values_list("id", flat=True)) == set([x.id for x in owned_rps])

    def test_filtered_by_role_assignment_when_unexpected_role(self, user_with_unexpected_role):
        RevenueProgramFactory.create_batch(3)
        assert RevenueProgram.objects.filtered_by_role_assignment(user_with_unexpected_role.roleassignment).count() == 0
        "revenue_program,expect_connected",

    @pytest_cases.parametrize(
        "mailchimp_server_prefix,mailchimp_access_token,expect_connected",
        (
            ("something", "something", True),
            (None, "something", False),
            ("something", None, False),
            (None, None, False),
        ),
    )
    def test_mailchimp_integration_connected_property(
        self, mailchimp_server_prefix, mailchimp_access_token, expect_connected, settings, mocker
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_access_token",
            return_value=mailchimp_access_token,
            new_callable=mocker.PropertyMock,
        )
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix=mailchimp_server_prefix)
        assert revenue_program.mailchimp_integration_connected is expect_connected

    def test_handle_mailchimp_api_client_read_error_when_404(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "debug")
        assert (
            revenue_program.handle_mailchimp_api_client_read_error(
                entity := "entity", ApiClientError("Not Found", status_code=404)
            )
            is None
        )
        logger_spy.assert_called_once_with(
            "Mailchimp %s not found for RP %s, returning None", entity, revenue_program.id
        )

    def test_handle_mailchimp_api_client_read_error_when_429(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "debug")
        with pytest.raises(MailchimpRateLimitError):
            revenue_program.handle_mailchimp_api_client_read_error(
                "entity", ApiClientError("Slow down!", status_code=429)
            )
        logger_spy.assert_called_once_with(
            "Mailchimp rate limit exceeded for RP %s, raising exception", revenue_program.id
        )

    def test_handle_mailchimp_api_client_read_error_when_unexpected(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "exception")
        assert (
            revenue_program.handle_mailchimp_api_client_read_error(
                "entity", ApiClientError(error_text := "Slow down!", status_code=500)
            )
            is None
        )
        logger_spy.assert_called_once_with("Unexpected error from Mailchimp API. The error text is %s", error_text)

    def test_mailchimp_store_when_api_client_error(self, mc_connected_rp, mocker):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.get_store.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_store
        mock_handle_error.assert_called_once_with("store", error)

    def test_mailchimp_store_when_not_connected(self, revenue_program):
        assert revenue_program.mailchimp_integration_connected is False
        assert revenue_program.mailchimp_store is None

    def test_mailchimp_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        assert mc_connected_rp.mailchimp_integration_connected is True
        mock_store_response = Mock()
        mock_store_response.ecommerce.get_store.return_value = mailchimp_store_from_api
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_store_response,
        )
        assert mc_connected_rp.mailchimp_store == MailchimpStore(**mailchimp_store_from_api)

    def test_mailchimp_store_when_not_found(self, mc_connected_rp, mocker):
        assert mc_connected_rp.mailchimp_integration_connected is True
        mock_store_response = Mock()
        mock_store_response.ecommerce.get_store.side_effect = ApiClientError("Not Found", status_code=404)
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_store_response,
        )
        assert mc_connected_rp.mailchimp_store is None

    def test_handle_mailchimp_api_client_write_error_when_429(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "debug")
        with pytest.raises(MailchimpRateLimitError):
            revenue_program.handle_mailchimp_api_client_write_error(
                "entity", ApiClientError("Slow down!", status_code=429)
            )
        logger_spy.assert_called_once_with(
            "Mailchimp rate limit exceeded for RP %s, raising exception", revenue_program.id
        )

    def test_handle_mailchimp_api_client_write_error_when_unexpected(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "exception")
        with pytest.raises(MailchimpIntegrationError):
            revenue_program.handle_mailchimp_api_client_write_error(
                entity := "entity", ApiClientError(error_text := "Slow down!", status_code=500)
            )
        logger_spy.assert_called_once_with(
            "Error creating %s for RP %s. The error text is %s", entity, revenue_program.id, error_text
        )

    def test_make_mailchimp_store_when_api_client_error(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.payment_provider = PaymentProviderFactory()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.add_store.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_write_error"
        )
        mc_connected_rp.make_mailchimp_store()
        mock_handle_error.assert_called_once_with("store", error)

    def test_make_mailchimp_store_when_no_mailchimp_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        with pytest.raises(ValidationError):
            mc_connected_rp.make_mailchimp_store()

    def test_make_mailchimp_store_when_no_payment_provider(
        self,
        mc_connected_rp,
    ):
        mc_connected_rp.payment_provider = None
        mc_connected_rp.save()
        with pytest.raises(ValidationError):
            mc_connected_rp.make_mailchimp_store()

    def test_make_mailchimp_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        mock_client = Mock()
        mock_client.ecommerce.add_store.return_value = mailchimp_store_from_api
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_client,
        )
        store = mc_connected_rp.make_mailchimp_store()
        assert store == MailchimpStore(**mailchimp_store_from_api)

    def test_mailchimp_one_time_contribution_product_when_no_mailchimp_email_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_one_time_contribution_product is None

    def test_mailchimp_recurring_contribution_product_when_no_mailchimp_email_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_recurring_contribution_product is None

    def test_mailchimp_one_time_contribution_product_happy_path(
        self, mc_connected_rp, mailchimp_product_from_api, mocker
    ):
        mock_client = Mock()
        mock_client.ecommerce.get_store_product.return_value = mailchimp_product_from_api
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_client,
        )
        product = mc_connected_rp.mailchimp_one_time_contribution_product
        assert product == MailchimpProduct(**mailchimp_product_from_api)

    def test_mailchimp_one_time_contribution_product_happy_path_when_not_found(self, mc_connected_rp, mocker):
        mock_client = Mock()
        mock_client.ecommerce.get_store_product.side_effect = ApiClientError("Not Found", status_code=404)
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_client,
        )
        assert mc_connected_rp.mailchimp_one_time_contribution_product is None

    def test_mailchimp_one_time_contribution_product_when_api_error(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.get_store_product.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_one_time_contribution_product
        mock_handle_error.assert_called_once_with("one-time contribution product", error)

    def test_mailchimp_recurring_contribution_product_happy_path(
        self, mc_connected_rp, mailchimp_product_from_api, mocker
    ):
        mock_client = Mock()
        mock_client.ecommerce.get_store_product.return_value = mailchimp_product_from_api
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_client,
        )
        product = mc_connected_rp.mailchimp_recurring_contribution_product
        assert product == MailchimpProduct(**mailchimp_product_from_api)

    def test_mailchimp_recurring_contribution_product_happy_path_when_not_found(self, mc_connected_rp, mocker):
        mock_client = Mock()
        mock_client.ecommerce.get_store_product.side_effect = ApiClientError("Not Found", status_code=404)
        mocker.patch.object(
            mc_connected_rp,
            "get_mailchimp_client",
            return_value=mock_client,
        )
        assert mc_connected_rp.mailchimp_recurring_contribution_product is None

    def test_mailchimp_recurring_contribution_product_when_api_error(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.get_store_product.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_recurring_contribution_product
        mock_handle_error.assert_called_once_with("recurring contribution product", error)

    def test_make_mailchimp_one_time_contribution_product_happy_path(
        self, mc_connected_rp, mailchimp_product_from_api, mocker
    ):
        mock_client = Mock()
        mock_client.ecommerce.add_store_product.return_value = mailchimp_product_from_api
        mocker.patch.object(mc_connected_rp, "get_mailchimp_client", return_value=mock_client)
        product = mc_connected_rp.make_mailchimp_one_time_contribution_product()
        assert product == MailchimpProduct(**mailchimp_product_from_api)

    def test_make_mailchimp_recurring_contribution_product_happy_path(
        self, mc_connected_rp, mailchimp_product_from_api, mocker
    ):
        mock_client = Mock()
        mock_client.ecommerce.add_store_product.return_value = mailchimp_product_from_api
        mocker.patch.object(mc_connected_rp, "get_mailchimp_client", return_value=mock_client)
        product = mc_connected_rp.make_mailchimp_recurring_contribution_product()
        assert product == MailchimpProduct(**mailchimp_product_from_api)

    def test_make_mailchimp_one_time_contribution_product_when_api_client_error(self, mc_connected_rp, mocker):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.add_store_product.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_write_error"
        )
        mc_connected_rp.make_mailchimp_one_time_contribution_product()
        mock_handle_error.assert_called_once_with(mc_connected_rp.mailchimp_one_time_contribution_product_id, error)

    def test_make_mailchimp_recurring_contribution_product_when_api_client_error(self, mc_connected_rp, mocker):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.ecommerce.add_store_product.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_write_error"
        )
        mc_connected_rp.make_mailchimp_recurring_contribution_product()
        mock_handle_error.assert_called_once_with(mc_connected_rp.mailchimp_recurring_contribution_product_id, error)

    def test_mailchimp_email_list_when_no_mailchimp_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_email_list is None

    def test_mailchimp_email_list_happy_path(self, mc_connected_rp, mocker, mailchimp_email_list_from_api):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_list.return_value = mailchimp_email_list_from_api
        assert mc_connected_rp.mailchimp_email_list == MailchimpEmailList(**mailchimp_email_list_from_api)

    def test_mailchimp_email_list_when_api_error(self, mc_connected_rp, mocker):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_list.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_email_list
        mock_handle_error.assert_called_once_with("mailchimp email list", error, log_level_on_not_found="error")

    def test_mailchimp_contributor_segment_when_no_mailchimp_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_contributor_segment is None

    def test_mailchimp_contributor_segment_when_no_mailchimp_contributor_segment_id(self, mc_connected_rp):
        assert mc_connected_rp.mailchimp_contributor_segment_id is None
        assert mc_connected_rp.mailchimp_contributor_segment is None

    def test_mailchimp_contributor_segment_happy_path(
        self, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker
    ):
        mc_connected_rp.mailchimp_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_client = Mock()
        mock_client.lists.get_segment.return_value = mailchimp_contributor_segment_from_api
        mocker.patch.object(mc_connected_rp, "get_mailchimp_client", return_value=mock_client)
        segment = mc_connected_rp.mailchimp_contributor_segment
        assert segment == MailchimpSegment(**mailchimp_contributor_segment_from_api)

    def test_mailchimp_contributor_segment_when_not_found(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_client = Mock()
        mock_client.lists.get_segment.side_effect = ApiClientError("Not Found", status_code=404)
        mocker.patch.object(mc_connected_rp, "get_mailchimp_client", return_value=mock_client)
        assert mc_connected_rp.mailchimp_contributor_segment is None

    def test_mailchimp_contributor_segment_when_api_client_error(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.mailchimp_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_segment.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_contributor_segment
        mock_handle_error.assert_called_once_with("contributor segment", error)

    def test_mailchimp_recurring_segment_happy_path(
        self,
        mc_connected_rp,
        mocker,
        mailchimp_recurring_contributor_segment_from_api,
    ):
        mc_connected_rp.mailchimp_recurring_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_segment.return_value = mailchimp_recurring_contributor_segment_from_api
        assert mc_connected_rp.mailchimp_recurring_segment == MailchimpSegment(
            **mailchimp_recurring_contributor_segment_from_api
        )

    def test_mailchimp_recurring_segment_when_no_mailchimp_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_recurring_segment is None

    def test_mailchimp_recurring_contributor_segment_when_no_mailchimp_recurring_contributor_segment_id(
        self, mc_connected_rp
    ):
        assert mc_connected_rp.mailchimp_recurring_contributor_segment_id is None
        assert mc_connected_rp.mailchimp_recurring_segment is None

    def test_mailchimp_recurring_contributor_segment_when_not_found(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_recurring_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_client = Mock()
        mock_client.lists.get_segment.side_effect = ApiClientError("Not Found", status_code=404)
        mocker.patch.object(mc_connected_rp, "get_mailchimp_client", return_value=mock_client)
        assert mc_connected_rp.mailchimp_recurring_segment is None

    def test_mailchimp_recurring_segment_when_api_client_error(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.mailchimp_recurring_contributor_segment_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_segment.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_read_error"
        )
        mc_connected_rp.mailchimp_recurring_segment
        mock_handle_error.assert_called_once_with("recurring segment", error)

    def test_make_mailchimp_contributor_segment_when_no_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        with pytest.raises(ValidationError):
            mc_connected_rp.make_mailchimp_contributor_segment()

    def test_make_mailchimp_recurring_segment_when_no_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        with pytest.raises(ValidationError):
            mc_connected_rp.make_mailchimp_recurring_segment()

    def test_make_mailchimp_contributor_segment_when_api_error(self, mocker, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.create_segment.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_write_error"
        )
        mc_connected_rp.make_mailchimp_contributor_segment()
        mock_handle_error.assert_called_once_with(mc_connected_rp.mailchimp_contributor_segment_name, error)

    def test_make_mailchimp_recurring_segment_when_api_error(self, mocker, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = "something"
        mc_connected_rp.save()
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.create_segment.side_effect = (
            error := ApiClientError("Internal Server Error", status_code=500)
        )
        mock_handle_error = mocker.patch(
            "apps.organizations.models.RevenueProgram.handle_mailchimp_api_client_write_error"
        )
        mc_connected_rp.make_mailchimp_recurring_segment()
        mock_handle_error.assert_called_once_with(mc_connected_rp.mailchimp_recurring_segment_name, error)

    def test_make_mailchimp_contributor_segment_happy_path(
        self, mocker, mc_connected_rp, mailchimp_contributor_segment_from_api
    ):
        mock_get_client = mocker.patch.object(mc_connected_rp, "get_mailchimp_client")
        mock_get_client.return_value.lists.create_segment.return_value = mailchimp_contributor_segment_from_api
        assert mc_connected_rp.make_mailchimp_contributor_segment() == MailchimpSegment(
            **mailchimp_contributor_segment_from_api
        )

    def test_make_mailchimp_recurring_segment_happy_path(
        self,
        mocker,
        mc_connected_rp,
        mailchimp_recurring_contributor_segment_from_api,
    ):
        mock_get_client = mocker.patch.object(mc_connected_rp, "get_mailchimp_client")
        mock_get_client.return_value.lists.create_segment.return_value = (
            mailchimp_recurring_contributor_segment_from_api
        )
        assert mc_connected_rp.make_mailchimp_recurring_segment() == MailchimpSegment(
            **mailchimp_recurring_contributor_segment_from_api
        )

    def test_get_mailchimp_client_when_integration_not_connected(self, mocker, revenue_program):
        assert revenue_program.mailchimp_integration_connected is False
        with pytest.raises(ValueError):
            revenue_program.get_mailchimp_client()

    def test_ensure_mailchimp_store_when_no_store_exists(self, mc_connected_rp, mocker):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_store", None)
        mock_make_store = mocker.patch("apps.organizations.models.RevenueProgram.make_mailchimp_store")
        mc_connected_rp.ensure_mailchimp_store()
        mock_make_store.assert_called_once()

    def test_when_store_already_exists(self, mocker, mc_connected_rp):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_store", return_value="something-truthy")
        logger_spy = mocker.spy(logger, "info")
        mc_connected_rp.ensure_mailchimp_store()
        logger_spy.assert_called_once_with("Store already exists for rp_id=[%s]", mc_connected_rp.id)

    def test_ensure_mailchimp_one_time_contribution_product_when_no_product_exists(self, mc_connected_rp, mocker):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_one_time_contribution_product", None)
        mock_make_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_one_time_contribution_product"
        )
        mc_connected_rp.ensure_mailchimp_one_time_contribution_product()
        mock_make_product.assert_called_once()

    def test_ensure_mailchimp_one_time_contribution_product_when_product_already_exists(self, mocker, mc_connected_rp):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_one_time_contribution_product",
            return_value="something-truthy",
        )
        logger_spy = mocker.spy(logger, "info")
        mc_connected_rp.ensure_mailchimp_one_time_contribution_product()
        logger_spy.assert_called_once_with(
            "One-time contribution product already exists for rp_id=[%s]", mc_connected_rp.id
        )

    def test_ensure_mailchimp_recurring_contribution_product_when_no_product_exists(self, mc_connected_rp, mocker):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_recurring_contribution_product", None)
        mock_make_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_recurring_contribution_product",
        )
        mc_connected_rp.ensure_mailchimp_recurring_contribution_product()
        mock_make_product.assert_called_once()

    def test_ensure_mailchimp_recurring_contribution_product_when_product_already_exists(self, mocker, mc_connected_rp):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contribution_product",
            return_value="something-truthy",
        )
        logger_spy = mocker.spy(logger, "info")
        mc_connected_rp.ensure_mailchimp_recurring_contribution_product()
        logger_spy.assert_called_once_with(
            "Recurring contribution product already exists for rp_id=[%s]", mc_connected_rp.id
        )

    def test_ensure_mailchimp_contributor_segment_when_no_existing_contributor_segment(self, mc_connected_rp, mocker):
        save_spy = mocker.spy(RevenueProgram, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        my_id = "some-id"
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_contributor_segment",
            return_value=None,
            new_callable=mocker.PropertyMock,
        )
        mock_make_contributor_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_contributor_segment",
            return_value=Mock(id=my_id),
        )
        mc_connected_rp.ensure_mailchimp_contributor_segment()
        mock_make_contributor_segment.assert_called_once()
        save_spy.assert_called_once_with(
            mc_connected_rp, update_fields={"mailchimp_contributor_segment_id", "modified"}
        )
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with("ensure_mailchimp_contributor_segment updated contributor segment id")

    def test_ensure_mailchimp_contributor_segment_when_contributor_segment_already_exists(
        self, mc_connected_rp, mocker
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_contributor_segment",
            return_value="something-truthy",
            new_callable=mocker.PropertyMock,
        )
        logger_spy = mocker.spy(logger, "info")
        mc_connected_rp.ensure_mailchimp_contributor_segment()
        logger_spy.assert_called_once_with("Segment already exists for rp_id=[%s]", mc_connected_rp.id)

    def test_ensure_mailchimp_recurring_segment_when_no_existing_recurring_segment(self, mc_connected_rp, mocker):
        my_id = "some-id"
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        save_spy = mocker.spy(RevenueProgram, "save")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_segment",
            return_value=None,
            new_callable=mocker.PropertyMock,
        )
        mock_make_recurring_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_recurring_segment",
            return_value=Mock(id=my_id),
        )
        mc_connected_rp.ensure_mailchimp_recurring_segment()
        mock_make_recurring_segment.assert_called_once()
        save_spy.assert_called_once_with(
            mc_connected_rp, update_fields={"mailchimp_recurring_contributor_segment_id", "modified"}
        )
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with(
            "ensure_mailchimp_recurring_segment updated recurring contributor segment id"
        )

    def test_ensure_mailchimp_recurring_segment_when_recurring_segment_already_exists(self, mc_connected_rp, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_segment",
            return_value="something-truthy",
            new_callable=mocker.PropertyMock,
        )
        logger_spy = mocker.spy(logger, "info")
        mc_connected_rp.ensure_mailchimp_recurring_segment()
        logger_spy.assert_called_once_with("Segment already exists for rp_id=[%s]", mc_connected_rp.id)

    def test_publish_revenue_program_mailchimp_list_configuration_complete(self, revenue_program, mocker, settings):
        mock_publisher = mocker.patch("apps.organizations.models.Publisher")
        settings.RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC = (topic := "something")
        revenue_program.publish_revenue_program_mailchimp_list_configuration_complete()
        mock_publisher.get_instance.return_value.publish.assert_called_once_with(
            topic, Message(data=str(revenue_program.id))
        )


class TestPaymentProvider:
    def test_basics(self):
        t = PaymentProvider()
        str(t)

    def test_stripe_create_default_product(self):
        t = PaymentProvider(stripe_product_id=1)
        t.stripe_create_default_product()

    @pytest.mark.parametrize("name, symbol", settings.CURRENCIES.items())
    def test_get_currency_dict(self, name, symbol):
        t = PaymentProvider(currency=name)
        assert {"code": name, "symbol": symbol} == t.get_currency_dict()

    def test_bad_money_get_currency_dict(self):
        t = PaymentProvider(currency="StarBucks")
        assert {"code": "", "symbol": ""} == t.get_currency_dict()


@pytest.fixture
def benefit_level():
    return BenefitLevelFactory(lower_limit=50, upper_limit=100)


@pytest.mark.django_db
class BenefitLevelTest:
    def test_donation_range_when_normal(self, benefit_level):
        assert benefit_level.donation_range == f"${benefit_level.lower_limit}-{benefit_level.upper_limit}"

    def test_donation_range_when_no_upper(self, benefit_level):
        benefit_level.upper_limit = None
        benefit_level.save()
        assert benefit_level.donation_range == f"${benefit_level.lower_limit}+"

    def test_upper_lower_limit_validation(self, benefit_level):
        benefit_level.upper_limit = benefit_level.lower_limit - 1
        with pytest.raises(ValidationError) as v_error:
            benefit_level.clean()
            assert v_error.exception.message == "Upper limit must be greater than lower limit"


@pytest.mark.django_db
class TestPaymentProviderModel:
    def test_get_dependent_pages_with_publication_date(self, live_donation_page):
        future_published_page = DonationPageFactory(
            revenue_program=live_donation_page.revenue_program, published_date=timezone.now() + timedelta(days=1)
        )
        # create an unpublished page so test not trivial
        DonationPageFactory(revenue_program=live_donation_page.revenue_program, published_date=None)
        # Show gets list of contribution pages with pub date that indirectly reference the provider
        assert set(
            list(
                live_donation_page.revenue_program.payment_provider.get_dependent_pages_with_publication_date().values_list(
                    "id", flat=True
                )
            )
        ) == {live_donation_page.pk, future_published_page.pk}
