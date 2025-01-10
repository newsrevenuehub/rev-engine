from dataclasses import asdict
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import override_settings
from django.utils import timezone

import faker
import pytest
import stripe
from mailchimp_marketing.api_client import ApiClientError
from stripe import ApplePayDomain
from stripe.error import StripeError

import apps
from apps.common.models import SocialMeta
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.models import (
    MAX_APPEND_ORG_NAME_ATTEMPTS,
    ORG_SLUG_MAX_LENGTH,
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
    OrgNameNonUniqueError,
    PaymentProvider,
    Plans,
    PlusPlan,
    RevenueProgram,
    RevenueProgramMailchimpClient,
    TransactionalEmailStyle,
    logger,
)
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    OrganizationFactory,
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
            "style_limit": UNLIMITED_CEILING,
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
            "sidebar_elements": [*DEFAULT_PERMITTED_SIDEBAR_ELEMENTS, BENEFITS],
            "page_elements": [*DEFAULT_PERMITTED_PAGE_ELEMENTS, SWAG],
            "publish_limit": UNLIMITED_CEILING,
        }

    def test_core_plan_characteristics(self):
        assert asdict(CorePlan) == {
            "name": "CORE",
            "label": "Core",
            "page_limit": 5,
            "style_limit": UNLIMITED_CEILING,
            "custom_thank_you_page_enabled": True,
            "sidebar_elements": [*DEFAULT_PERMITTED_SIDEBAR_ELEMENTS, BENEFITS],
            "page_elements": DEFAULT_PERMITTED_PAGE_ELEMENTS,
            "publish_limit": 2,
        }

    @pytest.mark.parametrize(
        ("plan_name", "expected_plan"),
        [
            (FreePlan.name, FreePlan),
            (CorePlan.name, CorePlan),
            (PlusPlan.name, PlusPlan),
            ("not-found-name", None),
        ],
    )
    def test_get_plan(self, plan_name, expected_plan):
        assert Plans.get_plan(plan_name) == expected_plan


@pytest.mark.django_db
class TestOrganization:
    def test_stripe_subscription_when_stripe_subscription_id_is_none(self, organization):
        assert organization.stripe_subscription_id is None
        assert organization.stripe_subscription is None

    def test_stripe_subscription_when_exists(self, organization, mocker):
        organization.stripe_subscription_id = "sub_123"
        mocker.patch("stripe.Subscription.retrieve", return_value=(mock_sub := mocker.Mock()))
        assert organization.stripe_subscription == mock_sub

    def test_has_expected_plans(self):
        assert set(Organization.plan_name.field.choices) == {
            (Plans.FREE.value, Plans.FREE.label),
            (Plans.CORE.value, Plans.CORE.label),
            (Plans.PLUS.value, Plans.PLUS.label),
        }

    def test_basics(self):
        t = OrganizationFactory()
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
        """An org should not be deleteable when downstream contributions exist."""
        one_time_contribution.donation_page = live_donation_page
        one_time_contribution.save()
        expected = (
            "Cannot delete some instances of model 'Organization' because they are referenced through protected "
            "foreign keys: 'RevenueProgram.organization'."
        )
        with pytest.raises(ProtectedError, match=expected):
            live_donation_page.revenue_program.organization.delete()
        assert Organization.objects.filter(pk=live_donation_page.revenue_program.organization.pk).exists()

    def test_org_deletion_cascades_when_no_contributions_downstream(self, org_user_free_plan, live_donation_page):
        """An org and its cascading relationships should be deleted when no downstream contributions."""
        live_donation_page.revenue_program = org_user_free_plan.roleassignment.revenue_programs.first()
        live_donation_page.save()
        page_id = live_donation_page.id
        rp_ids = org_user_free_plan.roleassignment.revenue_programs.values_list("id", flat=True)
        ra_id = org_user_free_plan.roleassignment.id
        org_user_free_plan.roleassignment.organization.delete()
        assert not RevenueProgram.objects.filter(pk__in=rp_ids).exists()
        assert not DonationPage.objects.filter(pk=page_id).exists()
        assert not RoleAssignment.objects.filter(pk=ra_id).exists()

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "org_user_free_plan",
            "rp_user",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

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
        assert set(query.values_list("id", flat=True)) == {x.id for x in owned_orgs}

    def test_organization_filtered_by_role_assignment_when_unexpected_role(self, user_with_unexpected_role):
        OrganizationFactory.create_batch(3)
        assert Organization.objects.filtered_by_role_assignment(user_with_unexpected_role.roleassignment).count() == 0

    def test_generate_unique_name_when_not_already_exist(self):
        assert Organization.generate_unique_name("test") == "test"

    def test_generate_unique_name_when_already_exist(self, organization):
        pre_existing_name = organization.name
        assert Organization.generate_unique_name(pre_existing_name) == f"{pre_existing_name}-1"

    def test_generate_unique_name_when_too_many_similar_already_exist(self):
        OrganizationFactory(name=(name := "test"))
        for x in range(MAX_APPEND_ORG_NAME_ATTEMPTS + 1):
            OrganizationFactory(name=f"{name}-{x}")
        with pytest.raises(OrgNameNonUniqueError):
            Organization.generate_unique_name(name)

    def test_generate_slug_from_name(self, mocker):
        mock_normalize_slug = mocker.patch("apps.organizations.models.normalize_slug")
        Organization.generate_slug_from_name(name := "test")
        mock_normalize_slug.assert_called_once_with(name=name, max_length=ORG_SLUG_MAX_LENGTH)

    def test_generate_slug_from_name_when_slug_exists(self, mocker):
        slug = Organization.generate_slug_from_name(name := "test")
        OrganizationFactory(slug=slug, name=name)
        with pytest.raises(ValidationError):
            Organization.generate_slug_from_name(name)

    def test_downgrade_to_free_plan_happy_path(self, organization_on_core_plan_with_mailchimp_set_up, mocker):
        rp_count = 1
        assert organization_on_core_plan_with_mailchimp_set_up.plan_name == Plans.CORE.name
        assert organization_on_core_plan_with_mailchimp_set_up.stripe_subscription_id
        assert organization_on_core_plan_with_mailchimp_set_up.revenueprogram_set.count() == rp_count
        mock_reversion_set_comment = mocker.patch("reversion.set_comment")
        save_spy = mocker.spy(Organization, "save")
        mock_disable_mailchimp_integration = mocker.patch(
            "apps.organizations.models.RevenueProgram.disable_mailchimp_integration"
        )
        organization_on_core_plan_with_mailchimp_set_up.downgrade_to_free_plan()
        organization_on_core_plan_with_mailchimp_set_up.refresh_from_db()
        assert organization_on_core_plan_with_mailchimp_set_up.plan_name == Plans.FREE.name
        assert organization_on_core_plan_with_mailchimp_set_up.stripe_subscription_id is None
        save_spy.assert_called_once_with(
            organization_on_core_plan_with_mailchimp_set_up,
            update_fields={"plan_name", "stripe_subscription_id", "modified"},
        )
        mock_reversion_set_comment.assert_called_once_with(
            "`handle_customer_subscription_deleted_event` downgraded this org"
        )
        assert mock_disable_mailchimp_integration.call_count == rp_count

    def test_downgrade_to_free_plan_when_already_downgraded(self, mocker):
        org = OrganizationFactory(plan_name=Plans.FREE.name, stripe_subscription_id=None)
        logger_spy = mocker.spy(logger, "info")
        org.downgrade_to_free_plan()
        assert logger_spy.call_args == mocker.call("Org %s already downgraded to free plan", org.id)


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


@pytest.fixture
def revenue_program_with_no_default_donation_page():
    return RevenueProgramFactory(
        onboarded=True, default_donation_page=None, organization=OrganizationFactory(plus_plan=True)
    )


@pytest.fixture
def revenue_program_with_default_donation_page_all_transactional_email_style_values(test_jpeg_file):
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
    page = DonationPageFactory(revenue_program=rp, styles=style, header_logo=test_jpeg_file)
    assert page.header_logo is not None
    rp.default_donation_page = page
    return rp


@pytest.fixture
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
class TestRevenueProgramMailchimpClient:
    def test_errors_if_rp_disconnected(self, revenue_program):
        with pytest.raises(MailchimpIntegrationError):
            RevenueProgramMailchimpClient(revenue_program)

    def test_create_product_happy_path(self, mc_connected_rp, mailchimp_product_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store_product", return_value=mailchimp_product_from_api)
        assert client.create_product("test-product-id", "test-product-name") == MailchimpProduct(
            **mailchimp_product_from_api
        )
        client.ecommerce.add_store_product.assert_called_with(
            mc_connected_rp.mailchimp_store_id,
            {
                "id": "test-product-id",
                "title": "test-product-name",
                "variants": [
                    {
                        "id": "test-product-id",
                        "title": "test-product-name",
                    }
                ],
            },
        )

    def test_create_product_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store_product", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_product("test-product-id", "test-product-name")

    def test_create_segment_happy_path(self, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker):
        test_options = {}
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "create_segment", return_value=mailchimp_contributor_segment_from_api)
        assert client.create_segment("test-segment-name", test_options) == MailchimpSegment(
            **mailchimp_contributor_segment_from_api
        )
        client.lists.create_segment.assert_called_with(
            mc_connected_rp.mailchimp_list_id,
            {"name": "test-segment-name", "options": test_options},
        )

    def test_create_segment_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "create_segment", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_segment("test-segment-name", {})

    def test_create_segment_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_segment("test-segment-name", {})

    def test_create_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.payment_provider",
            return_value=mocker.MagicMock(currency="usd"),
            new_callable=mocker.PropertyMock,
        )
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store", return_value=mailchimp_store_from_api)
        assert client.create_store() == MailchimpStore(**mailchimp_store_from_api)
        client.ecommerce.add_store.assert_called_with(
            {
                "id": mc_connected_rp.mailchimp_store_id,
                "list_id": mc_connected_rp.mailchimp_list_id,
                "name": mc_connected_rp.mailchimp_store_name,
                "currency_code": mc_connected_rp.payment_provider.currency,
            }
        )

    def test_create_store_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_create_store_payment_provider_unset(self, mc_connected_rp):
        mc_connected_rp.payment_provider = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_create_store_api_error(self, mc_connected_rp, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.payment_provider",
            return_value=mocker.MagicMock(currency="usd"),
            new_callable=mocker.PropertyMock,
        )
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_get_email_list_happy_path(self, mc_connected_rp, mailchimp_email_list_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_list", return_value=mailchimp_email_list_from_api)
        assert client.get_email_list() == MailchimpEmailList(**mailchimp_email_list_from_api)
        client.lists.get_list.assert_called_with(mc_connected_rp.mailchimp_list_id)

    def test_get_email_list_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_list", side_effect=ApiClientError("test-error"))
        assert client.get_email_list() is None

    def test_get_email_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        assert client.get_email_list() is None

    def test_get_product_happy_path(self, mc_connected_rp, mailchimp_product_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store_product", return_value=mailchimp_product_from_api)
        assert client.get_product("test_id") == MailchimpProduct(**mailchimp_product_from_api)
        client.ecommerce.get_store_product.assert_called_with(mc_connected_rp.mailchimp_store_id, "test_id")

    def test_get_product_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store_product", side_effect=ApiClientError("test-error"))
        assert client.get_product("test_id") is None

    def test_get_segment_happy_path(self, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_segment", return_value=mailchimp_contributor_segment_from_api)
        assert client.get_segment(123) == MailchimpSegment(**mailchimp_contributor_segment_from_api)
        client.lists.get_segment.assert_called_with(mc_connected_rp.mailchimp_list_id, 123)

    def test_get_segment_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_segment", side_effect=ApiClientError("test-error"))
        assert client.get_segment(123) is None

    def test_get_segment_list_unset(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        assert client.get_segment(123) is None

    def test_get_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store", return_value=mailchimp_store_from_api)
        assert client.get_store() == MailchimpStore(**mailchimp_store_from_api)
        client.ecommerce.get_store.assert_called_with(mc_connected_rp.mailchimp_store_id)

    def test_get_store_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store", side_effect=ApiClientError("test-error"))
        assert client.get_store() is None

    def test_handle_read_404_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(logger, "debug")
        client._handle_read_error("test-entity", ApiClientError("test-error", 404), "debug")
        logger_spy.assert_called_with(
            "Mailchimp %s not found for RP %s, returning None", "test-entity", mc_connected_rp.id
        )

    def test_handle_read_429_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(logger, "warning")
        with pytest.raises(MailchimpRateLimitError):
            client._handle_read_error("test-entity", ApiClientError("test-error", 429))
        logger_spy.assert_called_with("Mailchimp rate limit exceeded for RP %s, raising exception", mc_connected_rp.id)

    def test_handle_write_429_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(logger, "warning")
        with pytest.raises(MailchimpRateLimitError):
            client._handle_write_error("test-entity", ApiClientError("test-error", 429))
        logger_spy.assert_called_with("Mailchimp rate limit exceeded for RP %s, raising exception", mc_connected_rp.id)


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
        assert t.slug == "b-o"
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
        t.default_donation_page = apps.pages.models.DonationPage()
        with pytest.raises(apps.organizations.models.ValidationError):
            t.clean()
        # Set to other RP
        t.default_donation_page = apps.pages.models.DonationPage(revenue_program=RevenueProgram())
        with pytest.raises(apps.organizations.models.ValidationError):
            t.clean()

    @override_settings(STRIPE_LIVE_MODE=True)
    def test_stripe_create_apple_pay_domain_happy_path(self, mocker):
        mock_stripe_create = mocker.patch.object(ApplePayDomain, "create")
        rp = RevenueProgramFactory(domain_apple_verified_date=None)
        rp.stripe_create_apple_pay_domain()
        rp.refresh_from_db()
        assert rp.domain_apple_verified_date is not None
        mock_stripe_create.assert_called_once_with(
            api_key=settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS,
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
        with pytest.raises(stripe.error.StripeError):
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
        mock_mc_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        return_val = {"lists": [mailchimp_email_list_from_api]}
        mock_mc_client.return_value.lists.get_all_lists.return_value = return_val
        assert revenue_program.mailchimp_email_lists == [MailchimpEmailList(**mailchimp_email_list_from_api)]

    def test_mailchimp_email_lists_property_when_integration_not_connected(self, mocker, revenue_program, settings):
        logger_spy = mocker.spy(logger, "debug")
        mock_mc_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
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
        mock_mc_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        mock_mc_client.return_value.lists.get_all_lists.side_effect = ApiClientError(error_text := "Ruh roh")
        mock_mc_client.return_value.lists.get_all_lists.return_value = {"lists": [{"id": "123", "name": "test"}]}
        log_spy = mocker.spy(logger, "exception")
        assert revenue_program.mailchimp_email_lists == []
        log_spy.assert_called_once_with(
            "Failed to fetch email lists from Mailchimp for RP with ID %s mc server prefix %s. The error text is %s",
            revenue_program.id,
            revenue_program.mailchimp_server_prefix,
            error_text,
        )

    @pytest.mark.parametrize("enabled", [True, False])
    def test_activecampaign_access_token(self, enabled, revenue_program, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = enabled
        mock_get_client = mocker.patch("apps.common.secrets.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = (val := b"something")
        assert revenue_program.activecampaign_access_token == (val.decode("utf-8") if enabled else None)

    @pytest.mark.parametrize(
        ("activecampaign_server_url", "activecampaign_access_token", "expect_connected"),
        [
            ("something", "something", True),
            (None, "something", False),
            ("something", None, False),
            (None, None, False),
        ],
    )
    def test_activecampaign_integration_connected_property(
        self, activecampaign_server_url, activecampaign_access_token, expect_connected, settings, mocker
    ):
        mocker.patch("apps.google_cloud.pubsub.Publisher.publish")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.activecampaign_access_token",
            return_value=activecampaign_access_token,
            new_callable=mocker.PropertyMock,
        )
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        revenue_program = RevenueProgramFactory(activecampaign_server_url=activecampaign_server_url)
        assert revenue_program.activecampaign_integration_connected is expect_connected

    @pytest.mark.parametrize("pubsub_enabled", [True, False])
    def test_publish_revenue_program_activecampaign_configuration_complete(
        self, pubsub_enabled, revenue_program, mocker, settings
    ):
        mocker.patch("apps.organizations.models.google_cloud_pub_sub_is_configured", return_value=pubsub_enabled)
        mock_publisher = mocker.patch("apps.organizations.models.Publisher")
        settings.RP_ACTIVECAMPAIGN_CONFIGURATION_COMPLETE_TOPIC = (topic := "something")
        revenue_program.publish_revenue_program_activecampaign_configuration_complete()
        if pubsub_enabled:
            mock_publisher.get_instance.return_value.publish.assert_called_once_with(
                topic, Message(data=str(revenue_program.id))
            )
        else:
            mock_publisher.get_instance.return_value.publish.assert_not_called()

    @pytest.fixture(
        params=[
            (
                "revenue_program_with_no_default_donation_page",
                lambda rp: HubDefaultEmailStyle,
            ),
            (
                "revenue_program_with_default_donation_page_all_transactional_email_style_values",
                lambda rp: TransactionalEmailStyle(
                    is_default_logo=False,
                    logo_url=rp.default_donation_page.header_logo.url,
                    logo_alt_text=rp.default_donation_page.header_logo_alt_text,
                    header_color=rp.default_donation_page.styles.styles["colors"]["cstm_mainHeader"],
                    header_font=rp.default_donation_page.styles.styles["font"]["heading"],
                    body_font=rp.default_donation_page.styles.styles["font"]["body"],
                    button_color=rp.default_donation_page.styles.styles["colors"]["cstm_CTAs"],
                ),
            ),
            (
                "revenue_program_with_default_donation_page_but_no_transactional_email_style_values",
                lambda rp: TransactionalEmailStyle(
                    is_default_logo=True,
                    logo_url=HubDefaultEmailStyle.logo_url,
                    logo_alt_text=HubDefaultEmailStyle.logo_alt_text,
                    header_color=None,
                    header_font=None,
                    body_font=None,
                    button_color=None,
                ),
            ),
        ]
    )
    def transactional_email_style_case(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1]

    def test_transactional_email_style_property(self, transactional_email_style_case):
        rp, make_expected_value_fn = transactional_email_style_case
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

    def test_cannot_delete_when_downstream_contributions(self, live_donation_page):
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
        sm_id = revenue_program.socialmeta.id
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
        settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS = "my_test_live_key"
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

    @pytest.mark.parametrize(
        "invalid_number",
        [
            "123",
            "xyz123",
            "12345678901",
            "something",
        ],
    )
    def test_contact_phone_validation_invalid_phone(self, revenue_program, invalid_number):
        revenue_program.contact_phone = invalid_number
        with pytest.raises(ValidationError):
            revenue_program.clean_fields()

    @pytest.mark.parametrize(
        "valid_number",
        [
            "+14155552671",
            "+1 415 555 2671",
            "+1 (415) 555-2671",
            "+1-415-555-2671",
            "+1.415.555.2671",
            "+5548988425364",
        ],
    )
    def test_contact_phone_validation_valid_phone(self, revenue_program, valid_number):
        revenue_program.contact_phone = valid_number
        revenue_program.clean_fields()

    def test_admin_benefit_options(self, revenue_program):
        assert isinstance(revenue_program.admin_benefit_options, list)

    def test_admin_benefitlevel_options(self, revenue_program):
        assert isinstance(revenue_program.admin_benefitlevel_options, list)

    @pytest.mark.parametrize(
        ("fiscal_status", "fiscal_sponsor_name", "non_profit_value"),
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
        ("fiscal_status", "fiscal_sponsor_name"),
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

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "org_user_free_plan",
            "rp_user",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

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
        assert set(query.values_list("id", flat=True)) == {x.id for x in owned_rps}

    def test_filtered_by_role_assignment_when_unexpected_role(self, user_with_unexpected_role):
        RevenueProgramFactory.create_batch(3)
        assert RevenueProgram.objects.filtered_by_role_assignment(user_with_unexpected_role.roleassignment).count() == 0

    @pytest.mark.parametrize(
        ("mailchimp_server_prefix", "mailchimp_access_token", "expect_connected"),
        [
            ("something", "something", True),
            (None, "something", False),
            ("something", None, False),
            (None, None, False),
        ],
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

    def test_mailchimp_store_when_not_connected(self, revenue_program):
        assert revenue_program.mailchimp_integration_connected is False
        assert revenue_program.mailchimp_store is None

    def test_mailchimp_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        assert mc_connected_rp.mailchimp_integration_connected is True
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_store.return_value = mailchimp_store_from_api
        assert mc_connected_rp.mailchimp_store == mailchimp_store_from_api

    def test_mailchimp_store_when_not_found(self, mc_connected_rp, mocker):
        assert mc_connected_rp.mailchimp_integration_connected is True
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_store.return_value = None
        assert mc_connected_rp.mailchimp_store is None

    def test_ensure_mailchimp_store_doesnt_create_when_exists(self, mc_connected_rp, mocker):
        assert mc_connected_rp.mailchimp_integration_connected is True
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        mc_connected_rp.ensure_mailchimp_store()
        assert not patched_client.return_value.create_store.called

    def test_ensure_mailchimp_store_creates_when_needed(self, revenue_program, mocker):
        assert revenue_program.mailchimp_integration_connected is False
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        revenue_program.ensure_mailchimp_store()
        assert patched_client.return_value.create_store.called

    def test_ensure_mailchimp_entities_calls(self, revenue_program, mocker):
        mocker.patch.object(revenue_program, "ensure_mailchimp_store")
        mocker.patch.object(revenue_program, "ensure_mailchimp_contribution_product")
        mocker.patch.object(revenue_program, "ensure_mailchimp_contributor_segment")
        revenue_program.ensure_mailchimp_entities()
        assert revenue_program.ensure_mailchimp_store.called
        revenue_program.ensure_mailchimp_contribution_product.assert_has_calls(
            [mocker.call("one_time"), mocker.call("recurring")], any_order=True
        )
        revenue_program.ensure_mailchimp_contributor_segment.assert_has_calls(
            [
                mocker.call(
                    "all_contributors",
                    {
                        "match": "all",
                        "conditions": [
                            {
                                "field": "ecomm_purchased",
                                "op": "member",
                            }
                        ],
                    },
                ),
                mocker.call(
                    "contributor",
                    {
                        "match": "all",
                        "conditions": [
                            {
                                "field": "ecomm_purchased",
                                "op": "member",
                            },
                            {
                                "field": "ecomm_prod",
                                "op": "is",
                                "value": revenue_program.mailchimp_one_time_contribution_product_name,
                            },
                        ],
                    },
                ),
                mocker.call(
                    "recurring_contributor",
                    {
                        "match": "all",
                        "conditions": [
                            {
                                "field": "ecomm_purchased",
                                "op": "member",
                            },
                            {
                                "field": "ecomm_prod",
                                "op": "is",
                                "value": revenue_program.mailchimp_recurring_contribution_product_name,
                            },
                        ],
                    },
                ),
            ]
        )

    def test_mailchimp_email_list_when_no_mailchimp_list_id(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert mc_connected_rp.mailchimp_email_list is None

    def test_mailchimp_email_list_happy_path(self, mc_connected_rp, mocker, mailchimp_email_list_from_api):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_email_list.return_value = mailchimp_email_list_from_api
        assert mc_connected_rp.mailchimp_email_list == mailchimp_email_list_from_api

    def test_mailchimp_email_list_when_not_found(self, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_email_list.return_value = None
        assert mc_connected_rp.mailchimp_email_list is None

    def test_publish_revenue_program_mailchimp_list_configuration_complete(self, revenue_program, mocker, settings):
        mock_publisher = mocker.patch("apps.organizations.models.Publisher")
        settings.RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC = (topic := "something")
        revenue_program.publish_revenue_program_mailchimp_list_configuration_complete()
        mock_publisher.get_instance.return_value.publish.assert_called_once_with(
            topic, Message(data=str(revenue_program.id))
        )

    def test_disable_mailchimp_integration(self, revenue_program, mocker):
        revenue_program.mailchimp_server_prefix = "something"
        revenue_program.mailchimp_list_id = "something"
        revenue_program.save()
        mock_delete_secret = mocker.patch("apps.common.secrets.GoogleCloudSecretProvider.__delete__")
        save_spy = mocker.spy(RevenueProgram, "save")
        mock_reversion_set_comment = mocker.patch("reversion.set_comment")
        revenue_program.disable_mailchimp_integration()
        revenue_program.refresh_from_db()
        assert revenue_program.mailchimp_server_prefix is None
        assert revenue_program.mailchimp_list_id is None
        save_spy.assert_called_once_with(
            revenue_program, update_fields={"mailchimp_server_prefix", "mailchimp_list_id", "modified"}
        )
        mock_reversion_set_comment.assert_called_once_with("disable_mailchimp_integration updated this RP")
        mock_delete_secret.assert_called_once()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "product_type",
    (
        ("one_time"),
        ("recurring"),
    ),
)
class TestRevenueProgramMailchimpProducts:
    def test_property_happy_path(self, product_type, mc_connected_rp, mailchimp_product_from_api, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_product.return_value = mailchimp_product_from_api
        product = getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product")
        assert product == mailchimp_product_from_api
        patched_client.return_value.get_product.assert_called_with(
            getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product_id")
        )

    def test_property_when_no_list_id(self, product_type, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product") is None

    def test_property_when_disconnected(self, product_type, revenue_program):
        assert not revenue_program.mailchimp_integration_connected
        assert getattr(revenue_program, f"mailchimp_{product_type}_contribution_product") is None

    def test_property_not_found(self, product_type, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_product.return_value = None
        assert getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product") is None

    def test_property_api_error_raises_exception(self, product_type, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_product.side_effect = MailchimpRateLimitError()
        with pytest.raises(MailchimpRateLimitError):
            getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product")

    def test_ensure_mailchimp_contribution_product_doesnt_create_when_exists(
        self, product_type, mc_connected_rp, mailchimp_product_from_api, mocker
    ):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        mocker.patch.object(
            mc_connected_rp, f"mailchimp_{product_type}_contribution_product", mailchimp_product_from_api
        )
        mc_connected_rp.ensure_mailchimp_contribution_product(product_type)
        assert not patched_client.return_value.create_product.called

    def test_ensure_mailchimp_contribution_product_creates_when_needed(self, product_type, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_product.return_value = None
        mc_connected_rp.ensure_mailchimp_contribution_product(product_type)
        patched_client.return_value.create_product.assert_called_with(
            getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product_id"),
            getattr(mc_connected_rp, f"mailchimp_{product_type}_contribution_product_name"),
        )

    def test_ensure_mailchimp_contribution_product_handles_error(self, product_type, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_product.return_value = None
        patched_client.return_value.create_product.side_effect = MailchimpIntegrationError("test-error")
        mc_connected_rp.ensure_mailchimp_contribution_product(product_type)


@pytest.mark.django_db
@pytest.mark.parametrize("segment_type", (("all_contributors"), ("contributor"), ("recurring_contributor")))
class TestRevenueProgramMailchimpSegments:
    def test_property_happy_path(self, segment_type, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", "test-segment-id")
        mc_connected_rp.save()
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_segment.return_value = mailchimp_contributor_segment_from_api
        segment = getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment")
        patched_client.return_value.get_segment.assert_called_with("test-segment-id")
        assert segment == mailchimp_contributor_segment_from_api

    def test_property_when_no_list_id(self, segment_type, mc_connected_rp):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", "test-segment-id")
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()
        assert getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment") is None

    def test_property_when_disconnected(self, segment_type, revenue_program):
        assert not revenue_program.mailchimp_integration_connected
        assert getattr(revenue_program, f"mailchimp_{segment_type}_segment") is None

    def test_property_when_no_segment_id(self, segment_type, mc_connected_rp):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", None)
        mc_connected_rp.save()
        assert getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment") is None

    def test_property_not_found(self, segment_type, mc_connected_rp, mocker):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", "test-segment-id")
        mc_connected_rp.save()
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_segment.return_value = None
        assert getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment") is None

    def test_property_api_error_raises_exception(self, segment_type, mc_connected_rp, mocker):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", "test-segment-id")
        mc_connected_rp.mailchimp_list_id = None
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_segment.side_effect = MailchimpRateLimitError()
        with pytest.raises(MailchimpRateLimitError):
            getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment")

    def test_ensure_mailchimp_contributor_segment_doesnt_create_when_exists(
        self, segment_type, mc_connected_rp, mocker
    ):
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", "test-segment-id")
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        mc_connected_rp.ensure_mailchimp_contributor_segment(segment_type, {})
        assert not patched_client.return_value.create_product.called

    def test_ensure_mailchimp_contributor_segment_creates_when_needed(self, segment_type, mc_connected_rp, mocker):
        mock_options = {}
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_segment.return_value = None
        patched_client.return_value.create_segment.return_value = mocker.MagicMock(id="test-new-id")
        setattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_id", None)
        mc_connected_rp.ensure_mailchimp_contributor_segment(segment_type, mock_options)
        patched_client.return_value.create_segment.assert_called_with(
            getattr(mc_connected_rp, f"mailchimp_{segment_type}_segment_name"), mock_options
        )

    def test_ensure_mailchimp_contributor_segment_handles_error(self, segment_type, mc_connected_rp, mocker):
        patched_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        patched_client.return_value.get_segment.return_value = None
        patched_client.return_value.create_segment.side_effect = MailchimpIntegrationError("test-error")
        mc_connected_rp.ensure_mailchimp_contributor_segment(segment_type, {})


class TestPaymentProvider:
    def test_basics(self):
        t = PaymentProvider()
        str(t)

    def test_stripe_create_default_product(self):
        t = PaymentProvider(stripe_product_id=1)
        t.stripe_create_default_product()

    @pytest.mark.parametrize(("name", "symbol"), settings.CURRENCIES.items())
    def test_get_currency_dict(self, name, symbol):
        t = PaymentProvider(currency=name)
        assert t.get_currency_dict() == {"code": name, "symbol": symbol}

    def test_bad_money_get_currency_dict(self):
        t = PaymentProvider(currency="StarBucks")
        assert t.get_currency_dict() == {"code": "", "symbol": ""}


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
        with pytest.raises(ValidationError, match="Upper limit must be greater than lower limit"):
            benefit_level.clean()


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
            live_donation_page.revenue_program.payment_provider.get_dependent_pages_with_publication_date().values_list(
                "id", flat=True
            )
        ) == {live_donation_page.pk, future_published_page.pk}
