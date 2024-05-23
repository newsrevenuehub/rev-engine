# """conftest.py

# This file contains a set of globally available fixtures for pytest tests. Each named fixture in this module is
# globally available as a function parameter in any pytest test function/method, with no requirement for explicit import.

# These fixtures are meant to provide a set of predictable test configurations that directly map to our business logic.

# Many (though not all) of the fixtures in this module wrap Python test factories (created using FactoryBoy). By pairing test
# fixtures and factories, we are able to start passing these fixtures as parameters to `parametrize` decorator calls. What's more,
# we can use multiple calls to the `parametrize` decorator to create tests that are run for each item in the Cartesian product
# of the two parametrizations.

# Concretely, this allows us to parametrize, say, a set of known users vs a set of endpoints.
# """
import base64
import datetime
import json
from dataclasses import asdict
from random import choice, randint, uniform
from unittest.mock import patch

from django.core.cache import cache

import pytest
import stripe
from faker import Faker
from rest_framework.test import APIClient
from waffle import get_waffle_flag_model

from apps.common.tests.test_resources import DEFAULT_FLAGS_CONFIG_MAPPING
from apps.contributions.choices import CardBrand, ContributionInterval
from apps.contributions.stripe_contributions_provider import StripePiAsPortalContribution
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.types import StripePaymentMetadataSchemaV1_4
from apps.organizations.models import (
    MailchimpEmailList,
    MailchimpProduct,
    MailchimpSegment,
    MailchimpStore,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.models import Roles, User
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory
from revengine.utils import __ensure_gs_credentials


fake = Faker()


@pytest.fixture(autouse=True)
def domain_apex(settings):
    settings.DOMAIN_APEX = "fundjournalism.org"
    return settings.DOMAIN_APEX


@pytest.fixture
def api_client():
    """A DRF test API client that can be used to make API-level requests"""
    return APIClient()


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture(autouse=True)
def suppress_google_cloud_secret_manager(settings):
    """Suppresses calls to Google Cloud Secret Manager in tests"""
    settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = False


@pytest.fixture
def suppress_stripe_webhook_sig_verification(mocker):
    """Makes it so stripe webhook signature verification always succeeds"""
    mocker.patch("stripe.webhook.WebhookSignature.verify_header", return_value=True)


@pytest.fixture()
def mock_stripe_retrieve_payment_method(monkeypatch):
    with open("apps/contributions/tests/fixtures/provider-payment-method-details.json") as f:
        payment_method_details = json.load(f)
    monkeypatch.setattr(
        "stripe.PaymentMethod.retrieve",
        lambda *args, **kwargs: payment_method_details,
    )


@pytest.fixture
def default_feature_flags() -> list[get_waffle_flag_model()]:
    Flag = get_waffle_flag_model()
    created = []
    for x in DEFAULT_FLAGS_CONFIG_MAPPING.values():
        created.append(Flag.objects.get_or_create(name=x["name"], defaults={k: v for k, v in x.items() if k != "name"}))
    return created


@pytest.fixture
def hub_admin_user(default_feature_flags) -> User:
    """A user instance for a hub administrator

    The following items will be created (insofar as this note is not stale vis-a-vis implementation in RoleAssignmentFactory):

    - A user who is not a superuser
    - A role assignment
        - `user` is user
        - `role_type` is Roles.HUB_ADMIN
        - `revenue_programs` is empty list
        - `organization` is None
    """
    return RoleAssignmentFactory(role_type=Roles.HUB_ADMIN).user


@pytest.fixture
def org_user_free_plan(default_feature_flags) -> User:
    """A user instance for a self-onboarded free plan organization user

    The following items will be created (insofar as this note is not stale vis-a-vis implementation in RoleAssignmentFactory):

    - A user who is not a superuser
    - An organization on the free plan
    - A revenue program that is a child of the organization
    - A role assignment
        - `user` is user
        - `role_type` is Roles.ORG_ADMIN
        - `revenue_programs` has one item: the revenue program from above
        - `organization` is the organization from above
    """
    ra = RoleAssignmentFactory(
        org_admin_free_plan=True,
    )
    ra.revenue_programs.set([RevenueProgramFactory.create(organization=ra.organization)])
    ra.save()
    return ra.user


@pytest.fixture
def user_with_verified_email_and_tos_accepted():
    return UserFactory(accepted_terms_of_service=datetime.datetime.utcnow(), email_verified=True)


@pytest.fixture
def org_user_multiple_rps(org_user_free_plan, default_feature_flags) -> User:
    """A user instance for an org admin administering multiple RPs

    The following items will be created (insofar as this note is not stale vis-a-vis implementation in RoleAssignmentFactory):

    - A user who is not a superuser
    - An organization on the free plan
    - 3 revenue programs that are a children of the organization
    - A role assignment
        - `user` is user
        - `role_type` is Roles.ORG_ADMIN
        - `revenue_programs` has one item: the revenue program from above
        - `organization` is the organization from above
    """
    ra = RoleAssignmentFactory(
        org_admin_free_plan=True,
    )
    ra.revenue_programs.set(RevenueProgramFactory.create_batch(size=3, organization=ra.organization))
    ra.save()
    return ra.user


@pytest.fixture
def superuser(admin_user, default_feature_flags) -> User:
    """A user instance for superuser"""
    ra = RoleAssignmentFactory(
        user=admin_user,
        organization=None,
    )
    ra.user.is_superuser = True
    ra.user.save()
    return ra.user


@pytest.fixture
def rp_user(org_user_multiple_rps, default_feature_flags) -> User:
    """A user instance for a revenue program admin administering a subset of an organization's revenue programs

    The following items will be created (insofar as this note is not stale vis-a-vis implementation in RoleAssignmentFactory):

    - A user who is not a superuser
    - An organization on the free plan
    - 3 revenue programs that are a children of the organization
    - A role assignment
        - `user` is user
        - `role_type` is Roles.RP_ADMIN
        - `revenue_programs` has one item: the organization's first revenue program
        - `organization` is the organization from above
    """
    ra = RoleAssignmentFactory(
        role_type=Roles.RP_ADMIN,
        organization=org_user_multiple_rps.roleassignment.organization,
    )
    ra.revenue_programs.add(org_user_multiple_rps.roleassignment.revenue_programs.first().id)
    ra.save()
    return ra.user


@pytest.fixture
def user_no_role_assignment(default_feature_flags) -> User:
    return UserFactory()


@pytest.fixture
def user_with_unexpected_role(org_user_free_plan, default_feature_flags) -> User:
    return RoleAssignmentFactory(role_type="Surprise!").user


@pytest.fixture
def contributor_user(default_feature_flags) -> ContributorFactory:
    return ContributorFactory()


@pytest.fixture
def organization():
    return OrganizationFactory()


@pytest.fixture
def organization_on_core_plan_with_mailchimp_set_up():
    org = OrganizationFactory(core_plan=True)
    # note that an RP in this state will also have a `mailchimp_access_token` set, but that's not stored
    # in db layer and needs to be handled on case by case basis in test
    RevenueProgramFactory(organization=org, onboarded=True, mailchimp_server_prefix="us1")
    org.refresh_from_db()
    return org


@pytest.fixture
def revenue_program(organization):
    return RevenueProgramFactory(organization=organization)


@pytest.fixture
def free_plan_revenue_program():
    return RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(free_plan=True))


@pytest.fixture
def core_plan_revenue_program():
    return RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(core_plan=True))


@pytest.fixture
def plus_plan_revenue_program():
    return RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(plus_plan=True))


@pytest.fixture
def fiscally_sponsored_revenue_program():
    return RevenueProgramFactory(onboarded=True, fiscally_sponsored=True, fiscal_sponsor_name="Sponsor")


@pytest.fixture
def nonprofit_revenue_program():
    return RevenueProgramFactory(onboarded=True, non_profit=True)


@pytest.fixture
def for_profit_revenue_program():
    return RevenueProgramFactory(onboarded=True, for_profit=True)


@pytest.fixture
def live_donation_page():
    return DonationPageFactory(
        published=True,
        revenue_program=RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(free_plan=True)),
    )


@pytest.fixture
def style():
    return StyleFactory()


@pytest.fixture
def one_time_contribution(live_donation_page):
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        return ContributionFactory(donation_page=live_donation_page, one_time=True)


@pytest.fixture
def monthly_contribution(live_donation_page):
    return ContributionFactory(donation_page=live_donation_page, monthly_subscription=True)


@pytest.fixture
def annual_contribution(live_donation_page):
    return ContributionFactory(donation_page=live_donation_page, annual_subscription=True)


@pytest.fixture
def flagged_contribution():
    return ContributionFactory(one_time=True, flagged=True)


@pytest.fixture
def rejected_contribution():
    return ContributionFactory(monthly_subscription=True, rejected=True)


@pytest.fixture
def canceled_contribution():
    return ContributionFactory(monthly_subscription=True, canceled=True)


@pytest.fixture
def refunded_contribution():
    return ContributionFactory(one_time=True, refunded=True)


@pytest.fixture
def successful_contribution():
    return ContributionFactory(one_time=True)


@pytest.fixture
def processing_contribution():
    return ContributionFactory(processing=True)


@pytest.mark.django_db()
@pytest.fixture
def donation_page():
    return DonationPageFactory()


@pytest.fixture
def stripe_payment_intent_retrieve_response():
    """This is a *dict* version of the data that a retrieved Stripe PaymentIntent object will have

    The Stripe Python SDK puts that data into a custom object type that can behave both like a dict and
    like a class instance (in terms of dot-based attribute access).
    """
    with open("apps/contributions/tests/fixtures/stripe-payment-intent-retrieve.json") as fl:
        return json.load(fl)


@pytest.fixture
def stripe_setup_intent_retrieve_response():
    """This is a *dict* version of the data that a retrieved Stripe SetupIntent object will have

    The Stripe Python SDK puts that data into a custom object type that can behave both like a dict and
    like a class instance (in terms of dot-based attribute access).
    """
    with open("apps/contributions/tests/fixtures/stripe-setup-intent-retrieve.json") as fl:
        return json.load(fl)


@pytest.fixture
def stripe_subscription_retrieve_response():
    """This is a *dict* version of the data that a retrieved Stripe Subscription object will have

    The Stripe Python SDK puts that data into a custom object type that can behave both like a dict and
    like a class instance (in terms of dot-based attribute access).
    """
    with open("apps/contributions/tests/fixtures/stripe-subscription-retrieve.json") as fl:
        return json.load(fl)


def make_mock_mailchimp_email_list():
    return MailchimpEmailList(
        id=fake.uuid4(),
        web_id=fake.uuid4(),
        name=fake.word(),
        contact={},
        permission_reminder="",
        use_archive_bar=choice([True, False]),
        campaign_defaults={},
        notify_on_subscribe=choice([True, False]),
        notify_on_unsubscribe=choice([True, False]),
        date_created="",
        list_rating="",
        email_type_option=choice([True, False]),
        subscribe_url_short="",
        subscribe_url_long="",
        beamer_address="",
        visibility="",
        double_optin=choice([True, False]),
        has_welcome=choice([True, False]),
        marketing_permissions=choice([True, False]),
        modules=[],
        stats={},
        _links=[],
    )


@pytest.fixture
def mailchimp_email_list():
    return make_mock_mailchimp_email_list()


@pytest.fixture
def mailchimp_email_list_from_api(mailchimp_email_list):
    return asdict(mailchimp_email_list)


@pytest.fixture
def mc_connected_rp(revenue_program, mocker):
    mocker.patch(
        "apps.organizations.models.RevenueProgram.mailchimp_access_token",
        return_value="something-truthy",
        new_callable=mocker.PropertyMock,
    )
    revenue_program.mailchimp_server_prefix = "something-truthy"
    revenue_program.mailchimp_list_id = "something-truthy"
    revenue_program.save()
    return revenue_program


@pytest.fixture
def mailchimp_store_from_api():
    return asdict(
        MailchimpStore(
            id=fake.uuid4(),
            list_id=fake.uuid4(),
            name=fake.word(),
            platform="",
            domain="",
            is_syncing=choice([True, False]),
            email_address="",
            currency_code="",
            money_format="",
            primary_locale="",
            timezone="",
            phone="",
            address={},
            connected_site={},
            automations={},
            list_is_active=choice([True, False]),
            created_at="",
            updated_at="",
            _links=[],
        )
    )


@pytest.fixture
def mailchimp_product_from_api():
    return asdict(
        MailchimpProduct(
            id=fake.uuid4(),
            currency_code="",
            title="",
            handle="",
            url="",
            description="",
            type="",
            vendor="",
            image_url="",
            variants=[],
            images=[],
            published_at_foreign="",
            _links=[],
        )
    )


@pytest.fixture
def mailchimp_contributor_segment_from_api():
    return asdict(
        MailchimpSegment(
            id=fake.uuid4(),
            name="Contributors",
            member_count=randint(0, 100),
            type=choice(["static", "saved", "fuzzy"]),
            created_at="",
            updated_at="",
            options={},
            list_id=fake.uuid4(),
            _links=[],
        )
    )


@pytest.fixture
def mailchimp_recurring_contributor_segment_from_api():
    return asdict(
        MailchimpSegment(
            id=fake.uuid4(),
            name="Recurring contributors",
            member_count=randint(0, 100),
            type=choice(["static", "saved", "fuzzy"]),
            created_at="",
            updated_at="",
            options={},
            list_id=fake.uuid4(),
            _links=[],
        )
    )


@pytest.fixture
def minimally_valid_contribution_form_data(donation_page):
    return {
        "agreed_to_pay_fees": True,
        "amount": "120",
        "captcha_token": "12345",
        "donor_selected_amount": 120.0,
        "email": "bill@smith.com",
        "first_name": "Bill",
        "interval": "one_time",
        "last_name": "Smith",
        "mailing_city": "Raleigh",
        "mailing_complement": "Ap 1",
        "mailing_country": "United States",
        "mailing_postal_code": "27603",
        "mailing_state": "North Carolina",
        "mailing_street": "123 Glenwood Avenue",
        "page": donation_page.id,
    }


@pytest.fixture
def pi_as_portal_contribution_factory(faker):
    class Factory:
        def get(self, *args, **kwargs):
            defaults = {
                "id": faker.uuid4(),
                "revenue_program": f"rp-{faker.word()}",
                "payment_type": "card",
                "status": "paid",
                "amount": 100,
                "card_brand": "visa",
                "created": faker.date_time(tzinfo=datetime.timezone.utc),
                "credit_card_expiration_date": "12/29",
                "interval": ContributionInterval["MONTHLY"],
                "is_cancelable": True,
                "is_modifiable": True,
                "last_payment_date": faker.date_time(tzinfo=datetime.timezone.utc),
                "last4": "1234",
                "provider_customer_id": faker.pystr_format(string_format="cus_????"),
                "stripe_account_id": faker.pystr_format(string_format="acct_????"),
                "subscription_id": faker.pystr_format(string_format="sub_????"),
            }
            return StripePiAsPortalContribution(**(defaults | kwargs))

    return Factory()


@pytest.fixture
def valid_metadata_factory(faker, domain_apex):
    VALID_METADTA_V1_1 = {
        "schema_version": "1.1",
        "source": "rev-engine",
        "contributor_id": faker.uuid4(),
        "agreed_to_pay_fees": True,
        "donor_selected_amount": uniform(100.0, 1000.0),
        "reason_for_giving": None,
        "referer": f"https://www.{domain_apex}",
        "revenue_program_id": faker.uuid4(),
        "revenue_program_slug": f"rp-{faker.word()}",
        "sf_campaign_id": None,
        "comp_subscription": None,
        "honoree": None,
        "in_memory_of": None,
        "swag_opt_out": None,
        "t_shirt_size": None,
        "company_name": None,
    }

    class Factory:
        def get(self, *args, **kwargs):
            return VALID_METADTA_V1_1 | kwargs

    return Factory()


@pytest.fixture
def payment_method_data_factory(faker):
    """Fixture factory to generate data for a PaymentMethod"""
    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="pm_??????"),
        "object": "payment_method",
        "billing_details": {
            "address": {
                "city": faker.city(),
                "country": faker.country_code(),
                "line1": faker.street_address(),
                "line2": None,
                "postal_code": faker.postcode(),
                "state": faker.state_abbr(),
            },
            "email": faker.email(),
            "name": faker.name(),
            "phone": faker.phone_number(),
        },
        "card": {"brand": CardBrand.VISA.value, "last4": "4242", "exp_month": 8, "exp_year": 2022},
        "created": faker.unix_time(),
        "customer": faker.pystr_format(string_format="cus_??????"),
        "livemode": False,
        "metadata": {},
        "redaction": None,
        "type": "card",
    }

    class Factory:
        def get(self, *args, **kwargs):
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def default_paid_pi_data_factory(payment_method_data_factory, valid_metadata_factory, faker):
    """Fixture factory to generate data for a PaymentIntent"""
    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="pi_??????"),
        "object": "payment_intent",
        "amount": (amt := faker.random_int(min=100, max=100000)),
        "amount_capturable": 0,
        "amount_details": {},
        "amount_received": amt,
        "application": None,
        "application_fee_amount": None,
        "automatic_payment_methods": None,
        "capture_method": "automatic",
        "client_secret": faker.pystr_format(string_format="pi_??????_secret_??????"),
        "confirmation_method": "automatic",
        "created": faker.unix_time(),
        "currency": "usd",
        "customer": faker.pystr_format(string_format="cus_??????"),
        "description": "",
        "invoice": None,
        "last_payment_error": None,
        "latest_charge": None,
        "live_mode": False,
        "metadata": valid_metadata_factory.get(),
        "next_action": None,
        "on_behalf_of": None,
        "payment_method": payment_method_data_factory.get(),
        "payment_method_options": {},
        "payment_method_types": ["card"],
        "processing": None,
        "receipt_email": None,
        "redaction": None,
        "review": None,
        "setup_future_usage": None,
        "shipping": None,
        "statement_descriptor": None,
        "statement_descriptor_suffix": None,
        "status": "succeeded",
        "transfer_data": None,
        "transfer_group": None,
    }

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def invoice_line_item_data_factory(faker):
    """Fixture factory to generate data for an InvoiceLineItem"""
    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="ii_??????"),
        "object": "invoiceitem",
        "amount": 2000,
        "currency": "usd",
        "customer": faker.pystr_format(string_format="cus_??????"),
        "date": faker.unix_time(),
        "description": "support news",
        "discountable": True,
        "discounts": [],
        "invoice": faker.pystr_format(string_format="in_??????"),
        "livemode": False,
        "metadata": {},
        "period": {
            "end": faker.unix_time(),
            "start": faker.unix_time(),
        },
        "plan": {
            "interval": "month",
            "interval_count": 1,
        },
        "price": {
            "id": faker.pystr_format(string_format="price_??????"),
            "object": "price",
            "active": False,
            "billing_scheme": "per_unit",
            "created": faker.unix_time(),
            "currency": "usd",
            "custom_unit_amount": None,
            "livemode": False,
            "lookup_key": None,
            "metadata": {},
            "nickname": None,
            "product": faker.pystr_format(string_format="prod_??????"),
            "recurring": None,
            "tax_behavior": "unspecified",
            "tiers_mode": None,
            "transform_quantity": None,
            "type": "one_time",
            "unit_amount": 2000,
            "unit_amount_decimal": "2000",
        },
        "proration": False,
        "quantity": 1,
        "subscription": None,
        "tax_rates": [],
        "test_clock": None,
        "unit_amount": 2000,
        "unit_amount_decimal": "2000",
    }

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def plan_data_factory(faker):
    """Fixture factory to generate data for a Plan"""
    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="price_??????"),
        "object": "plan",
        "active": True,
        "aggregate_usage": None,
        "amount": 200000,
        "amount_decimal": "200000",
        "billing_scheme": "per_unit",
        "created": faker.unix_time(),
        "currency": "usd",
        "interval": "year",
        "interval_count": 1,
        "livemode": False,
        "metadata": {},
        "nickname": None,
        "product": faker.pystr_format(string_format="prod_??????"),
        "tiers_mode": None,
        "transform_usage": None,
        "trial_period_days": None,
        "usage_type": "licensed",
    }

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def subscription_data_factory(faker, plan_data_factory, payment_method_data_factory, valid_metadata_factory):
    """Factory to generate a subscription data

    NB: According to the official stripe docs for the version we're on (see
    https://web.archive.org/web/20200907115723/https://stripe.com/docs/api/subscriptions/object), the subscription
    object does not have a `.plan` attribute. Nevertheless, if you retrieve a subscription from the API using Python
    library via retrieving a payment intent (that is, if you retrieve a PI expanding pi.invoice.subscription.plan), there is
    indeed a `.plan` attribute. This fixture is meant to represent that data.
    """

    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="sub_??????"),
        "object": "subscription",
        "application": None,
        "application_fee_percent": None,
        "automatic_tax": {"enabled": False},
        "billing_cycle_anchor": faker.unix_time(),
        "billing_thresholds": None,
        "cancel_at": None,
        "cancel_at_period_end": False,
        "canceled_at": None,
        "cancellation_details": {"comment": None, "feedback": None, "reason": None},
        "collection_method": "charge_automatically",
        "created": faker.unix_time(),
        "currency": "usd",
        "current_period_end": faker.unix_time(),
        "current_period_start": faker.unix_time(),
        "customer": faker.pystr_format(string_format="cus_??????"),
        "days_until_due": None,
        "default_payment_method": payment_method_data_factory.get(),
        "default_source": None,
        "default_tax_rates": [],
        "description": None,
        "discount": None,
        "ended_at": None,
        "items": {
            "object": "list",
            "data": [
                {
                    "id": faker.pystr_format(string_format="si_??????"),
                    "object": "subscription_item",
                    "billing_thresholds": None,
                    "created": faker.unix_time(),
                    "metadata": {},
                    "price": {
                        "id": faker.pystr_format(string_format="plan_??????"),
                        "object": "price",
                        "active": True,
                        "billing_scheme": "per_unit",
                        "created": faker.unix_time(),
                        "currency": "usd",
                        "custom_unit_amount": None,
                        "livemode": False,
                        "lookup_key": None,
                        "metadata": {},
                        "nickname": None,
                        "product": faker.pystr_format(string_format="prod_??????"),
                        "recurring": {
                            "aggregate_usage": None,
                            "interval": "month",
                            "interval_count": 1,
                            "usage_type": "licensed",
                        },
                        "tax_behavior": "unspecified",
                        "tiers_mode": None,
                        "transform_quantity": None,
                        "type": "recurring",
                        "unit_amount": 2000,
                        "unit_amount_decimal": "2000",
                    },
                    "quantity": 1,
                    "subscription": faker.pystr_format(string_format="sub_??????"),
                    "tax_rates": [],
                }
            ],
            "has_more": False,
            "url": "/v1/subscription_items?subscription=sub_123",
        },
        "latest_invoice": faker.pystr_format(string_format="in_??????"),
        "livemode": False,
        "metadata": valid_metadata_factory.get(),
        "next_pending_invoice_item_invoice": None,
        "on_behalf_of": None,
        "pause_collection": None,
        "payment_settings": {
            "payment_method_options": None,
            "payment_method_types": None,
            "save_default_payment_method": None,
        },
        "pending_invoice_item_interval": None,
        "pending_setup_intent": None,
        "pending_update": None,
        "plan": plan_data_factory.get(),
        "schedule": faker.pystr_format(string_format="sub_sched_??????"),
        "start_date": faker.unix_time(),
        "status": "active",
        "test_clock": None,
        "transfer_data": None,
        "trial_end": None,
        "trial_settings": {"end_behavior": {"missing_payment_method": "create_invoice"}},
        "trial_start": None,
    }

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def invoice_data_for_active_sub_factory(faker, subscription_data_factory, invoice_line_item_data_factory):
    """Factory for creating data that can be used to create a Stripe invoice using .construct_from

    In practice, this is for data that gets returned when retrieving a payment intent
    from Stripe when "invoice.subscription.plan" is expanded (the plan attribute is expanded in `subscription`
    above).
    """
    DEFAULT_DATA = {
        "id": faker.pystr_format(string_format="in_??????"),
        "status_transitions": {"paid_at": faker.unix_time()},
        "lines": {"data": [invoice_line_item_data_factory.get()]},
        "next_payment_attempt": faker.unix_time(),
        "subscription": subscription_data_factory.get(),
    }

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def pi_data_for_active_subscription_factory(
    default_paid_pi_data_factory,
    invoice_data_for_active_sub_factory,
):
    DEFAULT_DATA = default_paid_pi_data_factory.get() | {"invoice": invoice_data_for_active_sub_factory.get()}

    class Factory:
        def get(self, *args, **kwargs) -> dict:
            return DEFAULT_DATA | kwargs

    return Factory()


@pytest.fixture
def pi_for_active_subscription_factory(pi_data_for_active_subscription_factory):
    class Factory:
        def get(self, *args, **kwargs) -> stripe.PaymentIntent:
            return stripe.PaymentIntent.construct_from(
                pi_data_for_active_subscription_factory.get() | kwargs, key="test"
            )

    return Factory()


@pytest.fixture
def pi_for_valid_one_time_factory(default_paid_pi_data_factory):
    class Factory:
        def get(self, *args, **kwargs) -> stripe.PaymentIntent:
            return stripe.PaymentIntent.construct_from(default_paid_pi_data_factory.get() | kwargs, key="test")

    return Factory()


@pytest.fixture
def pi_for_accepted_flagged_recurring_contribution(pi_for_active_subscription_factory):
    pm = stripe.PaymentMethod.construct_from({}, key="test")
    return pi_for_active_subscription_factory.get(
        payment_method=None,
        invoice=stripe.Invoice.construct_from({"subscription": {"default_payment_method": pm}}, key="test"),
    )


@pytest.fixture
def subscription_factory(subscription_data_factory):
    """Factory for creating a Stripe subscription object"""

    class Factory:
        def get(self, *args, **kwargs) -> stripe.Subscription:
            return stripe.Subscription.construct_from(subscription_data_factory.get() | kwargs, key="test")

    return Factory()


@pytest.fixture
def payment_intent_succeeded():
    with open("apps/contributions/tests/fixtures/payment-intent-succeeded-webhook.json") as fl:
        return json.load(fl)


@pytest.fixture
def minimally_valid_google_service_account_credentials():
    # This is a subset of the service account JSON. If any of these key/vals are missing,
    # `service_account.Credentials.from_service_account_info`
    return base64.b64encode(
        json.dumps(
            {
                # NB: normally we don't store private keys, but this is dummy data and okay to commit.
                # We break up BEGIN and PRIVATE KEY to evade the private key commit detection checks that would
                # otherwise complain about committing this private key to source code.
                "private_key": (
                    "-----BEGIN "
                    + "PRIVATE KEY-----\n"
                    + "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDY3E8o1NEFcjMM\n"
                    + "HW/5ZfFJw29/8NEqpViNjQIx95Xx5KDtJ+nWn9+OW0uqsSqKlKGhAdAo+Q6bjx2c\n"
                    + "uXVsXTu7XrZUY5Kltvj94DvUa1wjNXs606r/RxWTJ58bfdC+gLLxBfGnB6CwK0YQ\n"
                    + "xnfpjNbkUfVVzO0MQD7UP0Hl5ZcY0Puvxd/yHuONQn/rIAieTHH1pqgW+zrH/y3c\n"
                    + "59IGThC9PPtugI9ea8RSnVj3PWz1bX2UkCDpy9IRh9LzJLaYYX9RUd7++dULUlat\n"
                    + "AaXBh1U6emUDzhrIsgApjDVtimOPbmQWmX1S60mqQikRpVYZ8u+NDD+LNw+/Eovn\n"
                    + "xCj2Y3z1AgMBAAECggEAWDBzoqO1IvVXjBA2lqId10T6hXmN3j1ifyH+aAqK+FVl\n"
                    + "GjyWjDj0xWQcJ9ync7bQ6fSeTeNGzP0M6kzDU1+w6FgyZqwdmXWI2VmEizRjwk+/\n"
                    + "/uLQUcL7I55Dxn7KUoZs/rZPmQDxmGLoue60Gg6z3yLzVcKiDc7cnhzhdBgDc8vd\n"
                    + "QorNAlqGPRnm3EqKQ6VQp6fyQmCAxrr45kspRXNLddat3AMsuqImDkqGKBmF3Q1y\n"
                    + "xWGe81LphUiRqvqbyUlh6cdSZ8pLBpc9m0c3qWPKs9paqBIvgUPlvOZMqec6x4S6\n"
                    + "ChbdkkTRLnbsRr0Yg/nDeEPlkhRBhasXpxpMUBgPywKBgQDs2axNkFjbU94uXvd5\n"
                    + "znUhDVxPFBuxyUHtsJNqW4p/ujLNimGet5E/YthCnQeC2P3Ym7c3fiz68amM6hiA\n"
                    + "OnW7HYPZ+jKFnefpAtjyOOs46AkftEg07T9XjwWNPt8+8l0DYawPoJgbM5iE0L2O\n"
                    + "x8TU1Vs4mXc+ql9F90GzI0x3VwKBgQDqZOOqWw3hTnNT07Ixqnmd3dugV9S7eW6o\n"
                    + "U9OoUgJB4rYTpG+yFqNqbRT8bkx37iKBMEReppqonOqGm4wtuRR6LSLlgcIU9Iwx\n"
                    + "yfH12UWqVmFSHsgZFqM/cK3wGev38h1WBIOx3/djKn7BdlKVh8kWyx6uC8bmV+E6\n"
                    + "OoK0vJD6kwKBgHAySOnROBZlqzkiKW8c+uU2VATtzJSydrWm0J4wUPJifNBa/hVW\n"
                    + "dcqmAzXC9xznt5AVa3wxHBOfyKaE+ig8CSsjNyNZ3vbmr0X04FoV1m91k2TeXNod\n"
                    + "jMTobkPThaNm4eLJMN2SQJuaHGTGERWC0l3T18t+/zrDMDCPiSLX1NAvAoGBAN1T\n"
                    + "VLJYdjvIMxf1bm59VYcepbK7HLHFkRq6xMJMZbtG0ryraZjUzYvB4q4VjHk2UDiC\n"
                    + "lhx13tXWDZH7MJtABzjyg+AI7XWSEQs2cBXACos0M4Myc6lU+eL+iA+OuoUOhmrh\n"
                    + "qmT8YYGu76/IBWUSqWuvcpHPpwl7871i4Ga/I3qnAoGBANNkKAcMoeAbJQK7a/Rn\n"
                    + "wPEJB+dPgNDIaboAsh1nZhVhN5cvdvCWuEYgOGCPQLYQF0zmTLcM+sVxOYgfy8mV\n"
                    + "fbNgPgsP5xmu6dw2COBKdtozw0HrWSRjACd1N4yGu75+wPCcX/gQarcjRcXXZeEa\n"
                    + "NtBLSfcqPULqD+h7br9lEJio\n"
                    + "-----END PRIVATE KEY-----\n"
                ),
                "client_email": "123-abc@developer.gserviceaccount.com",
                "token_uri": "http://localhost:8080/token",
            }
        ).encode("utf-8")
    )


@pytest.fixture
def invalid_google_service_account_credentials():
    return base64.b64encode(json.dumps({}).encode("utf-8"))


@pytest.fixture
def valid_gs_credentials(minimally_valid_google_service_account_credentials, settings):
    settings.GS_CREDENTIALS = __ensure_gs_credentials(minimally_valid_google_service_account_credentials)


@pytest.fixture
def stripe_subscription():
    with open("apps/contributions/tests/fixtures/subscription.json") as fl:
        return stripe.Subscription.construct_from(json.load(fl), key="test")


def payment_intent_for_recurring_charge_expanded():
    with open("apps/contributions/tests/fixtures/payment-intent-for-recurring-charge-expanded.json") as f:
        return stripe.PaymentIntent.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def balance_transaction_for_recurring_charge():
    with open("apps/contributions/tests/fixtures/balance-transaction-for-recurring-charge.json") as f:
        return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def balance_transaction_for_subscription_creation_charge():
    with open("apps/contributions/tests/fixtures/balance-transaction-for-subscription-creation.json") as f:
        return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def payment_intent_for_subscription_creation_charge():
    with open("apps/contributions/tests/fixtures/payment-intent-for-subscription-creation-charge.json") as f:
        return stripe.PaymentIntent.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def payment_intent_succeeded_one_time_event(suppress_stripe_webhook_sig_verification):
    with open("apps/contributions/tests/fixtures/payment-intent-succeeded-one-time-event.json") as f:
        event = stripe.Webhook.construct_event(f.read(), None, stripe.api_key)
        return event


@pytest.fixture
@pytest.mark.usefixtures("suppress_stripe_webhook_sig_verification")
def payment_intent_succeeded_subscription_creation_event():
    with open("apps/contributions/tests/fixtures/payment-intent-succeeded-subscription-creation-event.json") as f:
        return stripe.Webhook.construct_event(f.read(), None, stripe.api_key)


@pytest.fixture
@pytest.mark.usefixtures("suppress_stripe_webhook_sig_verification")
def payment_intent_succeeded_subscription_recurring_charge_event():
    with open(
        "apps/contributions/tests/fixtures/payment-intent-succeeded-susbscription-recurring-charge-event.json"
    ) as f:
        return stripe.Webhook.construct_event(f.read(), None, stripe.api_key)


@pytest.fixture
def payment_intent_for_one_time_contribution():
    with open("apps/contributions/tests/fixtures/payment-intent-for-one-time-charge.json") as f:
        return stripe.PaymentIntent.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def payment_intent_for_recurring_charge():
    with open("apps/contributions/tests/fixtures/payment-intent-for-recurring-charge.json") as f:
        return stripe.PaymentIntent.construct_from(json.load(f), stripe.api_key)


@pytest.fixture
def balance_transaction_for_one_time_charge():
    with open("apps/contributions/tests/fixtures/balance-transaction-for-one-time-charge-expanded.json") as f:
        return stripe.BalanceTransaction.construct_from(json.load(f), stripe.api_key)


@pytest.fixture()
def clear_cache():
    cache.clear()


@pytest.fixture
def stripe_customer_default_source_expanded():
    with open("apps/contributions/tests/fixtures/stripe-customer-default-source-expanded.json") as fl:
        return stripe.Customer.construct_from(json.load(fl), key="test")


@pytest.fixture
def stripe_payment_method():
    with open("apps/contributions/tests/fixtures/stripe-payment-method.json") as fl:
        return stripe.PaymentMethod.construct_from(json.load(fl), key="test")


@pytest.fixture
def invoice_upcoming_event():
    return json.load(open("apps/contributions/tests/fixtures/invoice-upcoming-event.json"))


@pytest.fixture
def customer_subscription_updated_event():
    with open("apps/contributions/tests/fixtures/customer-subscription-updated-webhook-event.json") as fl:
        return json.load(fl)


@pytest.fixture
def charge_refunded_recurring_charge_event():
    with open("apps/contributions/tests/fixtures/charge-refunded-recurring-charge-event.json") as f:
        return stripe.Webhook.construct_event(f.read(), None, stripe.api_key)


@pytest.fixture
def valid_metadata(domain_apex):
    return StripePaymentMetadataSchemaV1_4(
        agreed_to_pay_fees=False,
        donor_selected_amount=1000.0,
        referer=f"https://www.{domain_apex}/",
        revenue_program_id=1,
        revenue_program_slug="testrp",
        schema_version="1.4",
        source="rev-engine",
    ).model_dump(mode="json", exclude_none=True)


@pytest.fixture
def invalid_metadata():
    # this would initially get through checks for schema version, but would fail when metadata schema is cast
    return {
        "schema_version": "1.4",
    }
