import pytest
from waffle import get_waffle_flag_model

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users import models


@pytest.fixture(params=["superuser", "hub_admin", "org_user_free_plan", "rp_user", "contributor_user"])
def expected_user(request):
    return request.getfixturevalue(request.param)


@pytest.fixture
def test_permitted_organizations_setup(rp_user, org_user_free_plan):
    OrganizationFactory.create_batch(3)
    assert (
        Organization.objects.filter(revenue_programs__in=[rp_user.roleassignment.revenue_programs.all()]).count() == 1
    )
    assert (
        Organization.objects.filter(
            revenue_programs__in=[org_user_free_plan.roleassignment.revenue_programs.all()]
        ).count()
        == 1
    )


@pytest.fixture
def test_permitted_revenue_programs_setup(rp_user, org_user_free_plan):
    RevenueProgramFactory.create_batch(3)
    assert RevenueProgram.objects.filter(roleassignement__user=rp_user).count() == 1
    assert RevenueProgram.objects.filter(roleassignement__user=org_user_free_plan).count() == 1


@pytest.fixture
def test_active_flags_setup(
    org_user_free_plan,
):
    Flag = get_waffle_flag_model()
    Flag.objects.delete()
    Flag(superusers=True, name="flag_superusers")
    Flag(everyone=True, name="flag_everyone")
    # etc


@pytest.fixture(
    params=[
        "superuser",
        ("superuser", "Superuser"),
        "hub_admin",
        ("hub_admin", "Hub Admin"),
        "rp_user",
        ("rp_admin", "RP Admin"),
        "org_user_free_plan",
        ("org_admin", "Org Admin"),
        "user_no_role_assignment",
        None,
        "contributor_user",
        None,
    ]
)
def ra_role_type_test_expectation(request):
    return request.getfixturevalue(request.param[0]), request.param[1]


@pytest.mark.django_db
class TestUser:
    def test_permitted_organizations(self, expected_user, test_permitted_organizations_setup):
        orgs = expected_user.permitted_organizations
        if (
            expected_user.is_superuser
            or expected_user.roleassignment
            and expected_user.roleassignment.role_type == models.Roles.HUB_ADMIN
        ):
            assert orgs.count() == Organization.objects.count()
            assert set(orgs.values_list("id", flat=True)) == set(Organization.objects.values_list("id", flat=True))
        elif expected_user.roleassignment:
            assert orgs.count() == 1
            assert orgs.first() == expected_user.roleassignment.organization
        else:
            assert orgs.count() == 0

    def test_permitted_revenue_programs(self, expected_user, test_permitted_revenue_programs_setup):
        rps = expected_user.permitted_revenue_programs
        if (
            expected_user.is_superuser
            or expected_user.roleassignment
            and expected_user.roleassignment.role_type == models.Roles.HUB_ADMIN
        ):
            assert rps.count() == RevenueProgram.objects.count()
            assert set(rps.values_list("id", flat=True)) == set(RevenueProgram.objects.values_list("id", flat=True))
        elif expected_user.roleassignment:
            assert rps.count() == 1
            assert rps.first() == expected_user.roleassignment.organization
        else:
            assert rps.count() == 0

    def test_active_flags(self, expected_user, test_active_flags_setup):
        pass

    def test_role_type(self, ra_role_type_test_expectation):
        user, expected_role_type = ra_role_type_test_expectation
        assert user.role_type == expected_role_type

    # what this about!?


#     def test_validate_unique(self):
#         user_1 = create_test_user()
#         user_2_email = user_1.email.upper()
#         user_2 = user_model(email=user_2_email, password="password")
#         with pytest.raises(exceptions.ValidationError) as _ex:
#             user_2.full_clean()
#         self.assertListEqual(_ex.value.messages, ["User with this Email already exists."])


class TestRoleAssignment:
    def test__str__(self):
        pass

    def test_can_access_rp(self):
        pass
