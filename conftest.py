"""conftest.py

This file contains a set of globally available fixtures for pytest tests. Each named fixture in this module is
globally available as a function parameter in any pytest test function/method, with no requirement for explicit import.

These fixtures are meant to provide a set of predictable test configurations that directly map to our business logic.

Many (though not all) of the fixtures in this module wrap Python test factories (created using FactoryBoy). By pairing test
fixtures and factories, we are able to start passing these fixtures as parameters to `parametrize` decorator calls. What's more,
we can use multiple calls to the `parametrize` decorator to create tests that are run for each item in the Cartesian product
of the two parametrizations.

Concretely, this allows us to parametrize, say, a set of known users vs a set of endpoints.

Here's an example:

```
@pytest_cases.parametrize(
    "user",
    (
        pytest_cases.fixture_ref("org_user_free_plan"),
        pytest_cases.fixture_ref("superuser"),
    ),
)
@pytest_cases.parametrize(
    "data,expect_status_code,error_response,has_fake_fields",
    (
        (pytest_cases.fixture_ref("rp_valid_patch_data"), status.HTTP_200_OK, None, False),
        (
            pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_short"),
            status.HTTP_400_BAD_REQUEST,
            {"tax_id": ["Ensure this field has at least 9 characters."]},
            False,
        ),
        (
            pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_long"),
            status.HTTP_400_BAD_REQUEST,
            {"tax_id": ["Ensure this field has no more than 9 characters."]},
            False,
        ),
        (
            pytest_cases.fixture_ref("rp_invalid_patch_data_unexpected_fields"),
            status.HTTP_200_OK,
            {},
            True,
        ),
    ),
)
def test_patch_when_expected_user(
    self, user, data, expect_status_code, error_response, has_fake_fields, api_client, revenue_program, mocker
):
```
"""
import pytest
from rest_framework.test import APIClient

from apps.contributions.tests.factories import ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory
from apps.users.models import Roles, User
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory


@pytest.fixture
def api_client():
    """A DRF test API client that can be used to make API-level requests"""
    return APIClient()


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture
def hub_admin_user() -> User:
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
def org_user_free_plan() -> User:
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
def org_user_multiple_rps(org_user_free_plan) -> User:
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
def superuser(admin_user) -> User:
    """A user instance for superuser"""
    return RoleAssignmentFactory(
        user=admin_user,
        organization=None,
    ).user


@pytest.fixture
def rp_user(org_user_multiple_rps) -> User:
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
def user_no_role_assignment() -> User:
    return UserFactory()


@pytest.fixture
def user_with_unexpected_role(org_user_free_plan) -> User:
    return RoleAssignmentFactory(role_type="Surprise!").user


@pytest.fixture
def contributor_user() -> ContributorFactory:
    return ContributorFactory()


@pytest.mark.django_db
@pytest.fixture
def organization():
    return OrganizationFactory()


@pytest.mark.django_db
@pytest.fixture
def revenue_program(organization):
    return RevenueProgramFactory(organization=organization)


@pytest.mark.django_db
@pytest.fixture
def live_donation_page():
    return DonationPageFactory(
        published=True,
        revenue_program=RevenueProgramFactory(onboarded=True, organization=OrganizationFactory(free_plan=True)),
    )
