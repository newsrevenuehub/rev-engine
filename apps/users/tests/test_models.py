from django.core.exceptions import ValidationError

import pytest
from waffle import get_waffle_flag_model

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users.models import Roles
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory


@pytest.fixture(params=["superuser", "hub_admin_user", "org_user_free_plan", "rp_user"])
def expected_user(request):
    return request.getfixturevalue(request.param)


@pytest.fixture
def test_permitted_organizations_setup(rp_user, org_user_free_plan):
    orgs = OrganizationFactory.create_batch(2)
    rp_user.roleassignment.organization = orgs[0]
    org_user_free_plan.roleassignment.organization = orgs[0]
    rp_user.roleassignment.save()
    org_user_free_plan.roleassignment.save()


@pytest.fixture
def test_permitted_revenue_programs_setup(rp_user, org_user_free_plan):
    org2 = OrganizationFactory()
    org1_rps = RevenueProgramFactory.create_batch(2, organization=org_user_free_plan.roleassignment.organization)
    RevenueProgramFactory(organization=org2)
    rp_user.roleassignment.organization = org_user_free_plan.roleassignment.organization
    rp_user.roleassignment.revenue_programs.add(org1_rps[0])
    rp_user.roleassignment.save()


@pytest.fixture
def everyone_flag():
    Flag = get_waffle_flag_model()
    return Flag.objects.create(everyone=True, name="flag_everyone", superusers=False)


@pytest.fixture
def superusers_flag():
    Flag = get_waffle_flag_model()
    return Flag.objects.create(superusers=True, name="flag_superusers", everyone=False)


@pytest.fixture()
def org_user_flag(org_user_free_plan):
    Flag = get_waffle_flag_model()
    flag = Flag.objects.create(name="flag_org_user", superusers=False, everyone=False)
    flag.users.add(org_user_free_plan)
    flag.save()
    return flag


@pytest.fixture(
    params=[
        (
            "superuser",
            ("everyone_flag", "superusers_flag"),
        ),
        (
            "org_user_free_plan",
            ("everyone_flag", "org_user_flag"),
        ),
        (
            "rp_user",
            ("everyone_flag",),
        ),
    ]
)
def test_active_flags_expectation(request, everyone_flag, superusers_flag, org_user_flag):
    Flag = get_waffle_flag_model()
    Flag.objects.exclude(id__in=[everyone_flag.id, superusers_flag.id, org_user_flag.id]).delete()
    return request.getfixturevalue(request.param[0]), [request.getfixturevalue(f) for f in request.param[1]]


@pytest.fixture(
    params=[
        ("superuser", ("superuser", "Superuser")),
        ("hub_admin_user", ("hub_admin", "Hub Admin")),
        ("rp_user", ("rp_admin", "RP Admin")),
        ("org_user_free_plan", ("org_admin", "Org Admin")),
        ("user_no_role_assignment", None),
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
            and expected_user.roleassignment.role_type == Roles.HUB_ADMIN
        ):
            assert orgs.count() == Organization.objects.count()
            assert set(orgs.values_list("id", flat=True)) == set(Organization.objects.values_list("id", flat=True))
        else:
            assert orgs.count() == 1
            assert orgs.first() == expected_user.roleassignment.organization

    def test_permitted_revenue_programs(self, expected_user, test_permitted_revenue_programs_setup):
        rps = expected_user.permitted_revenue_programs
        if (
            expected_user.is_superuser
            or expected_user.roleassignment
            and expected_user.roleassignment.role_type == Roles.HUB_ADMIN
        ):
            assert rps.count() == RevenueProgram.objects.count()
            assert set(rps.values_list("id", flat=True)) == set(RevenueProgram.objects.values_list("id", flat=True))
        else:
            assert rps.count() == expected_user.roleassignment.revenue_programs.count()
            assert set(rps.values_list("id", flat=True)) == set(
                expected_user.roleassignment.revenue_programs.values_list("id", flat=True)
            )

    def test_active_flags(self, test_active_flags_expectation):
        user, expected_flags = test_active_flags_expectation
        flags = user.active_flags
        assert flags.count() == len(expected_flags)
        assert set(flags.values_list("name", flat=True)) == set([f.name for f in expected_flags])

    def test_role_type(self, ra_role_type_test_expectation):
        user, expected_role_type = ra_role_type_test_expectation
        assert user.role_type == expected_role_type

    @pytest.mark.parametrize(
        "email1, email2, expect_valid",
        [
            ("foo@bar.com", "foo@bar.com", False),
            ("foo@bar.com", "FOO@BAR.com", False),
            ("foo@bar.com", "bizz@bang.com", True),
        ],
    )
    def test_email_is_case_insensitively_unique_if_full_clean(self, email1, email2, expect_valid):
        UserFactory(email=email1)
        if expect_valid:
            assert UserFactory.build(email=email2).full_clean() is None
        else:
            with pytest.raises(ValidationError):
                assert UserFactory.build(email=email2).full_clean()


@pytest.mark.django_db
class TestRoleAssignment:
    @pytest.mark.parametrize(
        "role_type, expected_fn",
        (
            (Roles.HUB_ADMIN.value, lambda x: Roles.HUB_ADMIN.label),
            (Roles.ORG_ADMIN.value, lambda x: f"{Roles.ORG_ADMIN.label} for {x.organization.name}"),
            (
                Roles.RP_ADMIN.value,
                lambda x: f"{Roles.RP_ADMIN.label} for these revenue programs: {', '.join([f'#{rp.pk}: {rp.name}' for rp in x.revenue_programs.all()])}",
            ),
            ("", lambda x: f"Unspecified RoleAssignment ({x.id})"),
        ),
    )
    def test__str__(self, role_type, expected_fn):
        assert str((ra := RoleAssignmentFactory(role_type=role_type))) == expected_fn(ra)
