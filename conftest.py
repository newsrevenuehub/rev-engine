import pytest
from rest_framework.test import APIClient

from apps.contributions.tests.factories import ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users.models import Roles, User
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory


# NB: The fixtures in this file will be globally available as function parameters in any pytest test function/method.
# They are meant to provide a set of predictable test fixtures that directly map to our business logic.


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
