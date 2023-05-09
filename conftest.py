# """conftest.py

# This file contains a set of globally available fixtures for pytest tests. Each named fixture in this module is
# globally available as a function parameter in any pytest test function/method, with no requirement for explicit import.

# These fixtures are meant to provide a set of predictable test configurations that directly map to our business logic.

# Many (though not all) of the fixtures in this module wrap Python test factories (created using FactoryBoy). By pairing test
# fixtures and factories, we are able to start passing these fixtures as parameters to `parametrize` decorator calls. What's more,
# we can use multiple calls to the `parametrize` decorator to create tests that are run for each item in the Cartesian product
# of the two parametrizations.

# Concretely, this allows us to parametrize, say, a set of known users vs a set of endpoints.

# Here's an example:

# ```
# @pytest_cases.parametrize(
#     "user",
#     (
#         pytest_cases.fixture_ref("org_user_free_plan"),
#         pytest_cases.fixture_ref("superuser"),
#     ),
# )
# @pytest_cases.parametrize(
#     "data,expect_status_code,error_response,has_fake_fields",
#     (
#         (pytest_cases.fixture_ref("rp_valid_patch_data"), status.HTTP_200_OK, None, False),
#         (
#             pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_short"),
#             status.HTTP_400_BAD_REQUEST,
#             {"tax_id": ["Ensure this field has at least 9 characters."]},
#             False,
#         ),
#         (
#             pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_long"),
#             status.HTTP_400_BAD_REQUEST,
#             {"tax_id": ["Ensure this field has no more than 9 characters."]},
#             False,
#         ),
#         (
#             pytest_cases.fixture_ref("rp_invalid_patch_data_unexpected_fields"),
#             status.HTTP_200_OK,
#             {},
#             True,
#         ),
#     ),
# )
# def test_patch_when_expected_user(
#     self, user, data, expect_status_code, error_response, has_fake_fields, api_client, revenue_program, mocker
# ):
# ```
# """
import json
from dataclasses import asdict
from random import choice
from unittest.mock import patch

import pytest
from faker import Faker
from rest_framework.test import APIClient
from waffle import get_waffle_flag_model

from apps.common.tests.test_resources import DEFAULT_FLAGS_CONFIG_MAPPING
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.models import MailchimpEmailList
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.models import Roles, User
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory


faker = Faker()


@pytest.fixture
def api_client():
    """A DRF test API client that can be used to make API-level requests"""
    return APIClient()


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture()
def mock_stripe_retrieve_payment_method(monkeypatch):
    with open("apps/contributions/tests/fixtures/provider-payment-method-details.json") as f:
        payment_method_details = json.load(f)
    monkeypatch.setattr(
        "stripe.PaymentMethod.retrieve",
        lambda *args, **kwargs: payment_method_details,
    )


@pytest.fixture
def default_feature_flags():
    Flag = get_waffle_flag_model()
    for x in DEFAULT_FLAGS_CONFIG_MAPPING.values():
        Flag.objects.get_or_create(name=x["name"], defaults={k: v for k, v in x.items() if k != "name"})


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
    return RevenueProgramFactory(onboarded=True, fiscally_sponsored=True)


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


@pytest.fixture
def mailchimp_email_list_from_api():
    return asdict(
        MailchimpEmailList(
            id=faker.uuid4(),
            web_id=faker.uuid4(),
            name=faker.word(),
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
    )


@pytest.fixture
def mc_connected_rp(revenue_program):
    revenue_program.mailchimp_access_token = "something-truthy"
    revenue_program.mailchimp_server_prefix = "something-truthy"
    revenue_program.mailchimp_list_id = "something-truthy"
    revenue_program.save()
    return revenue_program
