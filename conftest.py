import pytest
from rest_framework.test import APIClient


from apps.organizations.tests.factories import RevenueProgramFactory
from apps.users.models import Roles, User
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory
from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributorFactory


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture
def hub_admin_user() -> User:
    return RoleAssignmentFactory(role_type=Roles.HUB_ADMIN).user


@pytest.fixture
def org_user_free_plan() -> User:
    ra = RoleAssignmentFactory(
        org_admin_free_plan=True,
    )
    ra.revenue_programs.set([RevenueProgramFactory.create(organization=ra.organization)])
    ra.save()
    return ra.user


@pytest.fixture
def org_user_multiple_rps(org_user_free_plan) -> User:
    ra = RoleAssignmentFactory(
        org_admin_free_plan=True,
    )
    ra.revenue_programs.set(RevenueProgramFactory.create_batch(size=3, organization=ra.organization))
    ra.save()
    return ra.user


@pytest.fixture
def superuser(admin_user) -> User:
    return RoleAssignmentFactory(
        user=admin_user,
        organization=None,
    ).user


@pytest.fixture
def rp_user(org_user_multiple_rps) -> User:
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
