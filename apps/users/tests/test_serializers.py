from dataclasses import asdict
from unittest import mock

from django.contrib.auth import get_user_model

import pytest
from rest_framework.serializers import ValidationError
from rest_framework.test import APIRequestFactory, APITestCase
from waffle import get_waffle_flag_model

from apps.organizations.models import (
    FISCAL_SPONSOR_NAME_MAX_LENGTH,
    FiscalStatusChoices,
    Organization,
    OrgNameNonUniqueError,
    PaymentProvider,
    Plan,
    RevenueProgram,
)
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users import serializers
from apps.users.choices import Roles
from apps.users.constants import FIRST_NAME_MAX_LENGTH, JOB_TITLE_MAX_LENGTH, LAST_NAME_MAX_LENGTH
from apps.users.models import RoleAssignment
from apps.users.tests.factories import create_test_user


user_model = get_user_model()


@pytest.fixture
def valid_customize_account_data():
    return {
        "organization_name": "org name",
        "fiscal_sponsor_name": "",
        "last_name": "last name",
        "first_name": "first name",
        "job_title": "job title",
        "fiscal_status": FiscalStatusChoices.FOR_PROFIT.value,
    }


@pytest.mark.django_db
class TestCustomizeAccountSerializer:
    @pytest.mark.parametrize("exceed", [True, False])
    @pytest.mark.parametrize(
        "field, max_length",
        (
            ("organization_name", serializers.CUSTOMIZE_ACCOUNT_ORG_NAME_MAX_LENGTH),
            ("fiscal_sponsor_name", FISCAL_SPONSOR_NAME_MAX_LENGTH),
            ("last_name", LAST_NAME_MAX_LENGTH),
            ("first_name", FIRST_NAME_MAX_LENGTH),
            ("job_title", JOB_TITLE_MAX_LENGTH),
        ),
    )
    def test_enforces_max_length_on_relevant_fields(self, exceed, field, max_length, organization):
        val = "a" * (max_length + 1) if exceed else "a" * max_length
        serializer = serializers.CustomizeAccountSerializer(instance=organization, data={field: val}, partial=True)
        assert serializer.is_valid() if not exceed else not serializer.is_valid()
        assert field in serializer.errors if exceed else field not in serializer.errors
        if exceed:
            assert serializer.errors[field][0].code == "max_length"

    def test_handle_organization_name(self, mocker):
        mock_generate_unique_name = mocker.patch(
            "apps.organizations.models.Organization.generate_unique_name", return_value=(returned := "some name")
        )
        assert serializers.CustomizeAccountSerializer.handle_organization_name((sent := "sent name")) == returned
        mock_generate_unique_name.assert_called_once_with(sent)

    def test_handle_organization_name_when_org_name_non_unique_error(self, mocker):
        mocker.patch(
            "apps.organizations.models.Organization.generate_unique_name",
            side_effect=OrgNameNonUniqueError("non unique!"),
        )
        with pytest.raises(ValidationError) as exc:
            serializers.CustomizeAccountSerializer.handle_organization_name("sent name")
        assert (
            exc.value.detail == ValidationError({"organization_name": ["Organization name is already in use."]}).detail
        )

    def test_save_override(self, valid_customize_account_data, mocker):
        mock_handle_organization_name = mocker.patch(
            "apps.users.serializers.CustomizeAccountSerializer.handle_organization_name",
            return_value=(new_name := "new name"),
        )
        mock_super_save = mocker.patch(
            "rest_framework.serializers.Serializer.save", return_value=(instance := "something")
        )
        serializer = serializers.CustomizeAccountSerializer(data=valid_customize_account_data)
        assert serializer.is_valid()
        assert serializer.save() == instance
        mock_handle_organization_name.assert_called_once_with(valid_customize_account_data["organization_name"])
        assert serializer.validated_data["organization_name"] == new_name
        mock_super_save.assert_called_once()

    def test_create_override(self, valid_customize_account_data, user_no_role_assignment, mocker):
        mocker.patch("apps.users.serializers.CustomizeAccountSerializer.context", {"user": user_no_role_assignment})
        user_save_spy = mocker.spy(user_no_role_assignment, "save")
        mock_set_comment = mocker.patch("reversion.set_comment")
        serializer = serializers.CustomizeAccountSerializer()
        result = serializer.create(
            valid_customize_account_data | {"organization_slug": "slug", "organization_tax_id": (tax_id := "123456789")}
        )
        # have to do this cause TypedDict does not support using `isinstance`
        assert set(result.keys()) == {"organization", "revenue_program", "user", "role_assignment"}
        assert isinstance((org := result["organization"]), Organization)
        assert isinstance((rp := result["revenue_program"]), RevenueProgram)
        assert isinstance((user := result["user"]), user_model)
        assert isinstance((ra := result["role_assignment"]), RoleAssignment)
        assert org.name == valid_customize_account_data["organization_name"]
        assert org.slug == "slug"
        assert rp.name == org.name
        assert rp.organization == org
        assert rp.slug == org.slug
        assert rp.fiscal_status == valid_customize_account_data["fiscal_status"]
        assert rp.tax_id == tax_id
        assert isinstance(rp.payment_provider, PaymentProvider)
        assert rp.fiscal_sponsor_name == valid_customize_account_data["fiscal_sponsor_name"]
        assert user.first_name == valid_customize_account_data["first_name"]
        assert user.last_name == valid_customize_account_data["last_name"]
        assert user.job_title == valid_customize_account_data["job_title"]
        user_save_spy.assert_called_once_with(update_fields={"first_name", "last_name", "job_title", "modified"})
        mock_set_comment.assert_called_once_with("CustomizeAccountSerializer.create updated user")
        assert ra.user == user
        assert ra.role_type == Roles.ORG_ADMIN
        assert ra.organization == org

    @pytest.mark.parametrize(
        "fiscal_sponsor_name, fiscal_status, error_message",
        (
            ("", FiscalStatusChoices.FISCALLY_SPONSORED, serializers.FISCAL_SPONSOR_NAME_REQUIRED_ERROR_MESSAGE),
            (None, FiscalStatusChoices.FISCALLY_SPONSORED, serializers.FISCAL_SPONSOR_NAME_REQUIRED_ERROR_MESSAGE),
            ("truthy", FiscalStatusChoices.FISCALLY_SPONSORED, None),
            ("", FiscalStatusChoices.FOR_PROFIT, None),
            (None, FiscalStatusChoices.FOR_PROFIT, None),
            ("truthy", FiscalStatusChoices.FOR_PROFIT, serializers.FISCAL_SPONSOR_NAME_NOT_PERMITTED_ERROR_MESSAGE),
            ("", FiscalStatusChoices.NONPROFIT, None),
            (None, FiscalStatusChoices.NONPROFIT, None),
            ("truthy", FiscalStatusChoices.NONPROFIT, serializers.FISCAL_SPONSOR_NAME_NOT_PERMITTED_ERROR_MESSAGE),
        ),
    )
    def test_validate_fiscal_status(
        self, fiscal_sponsor_name, fiscal_status, error_message, valid_customize_account_data
    ):
        data = valid_customize_account_data | {
            "fiscal_sponsor_name": fiscal_sponsor_name,
            "fiscal_status": fiscal_status,
        }
        serializer = serializers.CustomizeAccountSerializer(data=data)
        if not error_message:
            assert serializer.validate_fiscal_status(fiscal_status) == fiscal_status
        else:
            with pytest.raises(ValidationError) as exc:
                serializer.validate_fiscal_status(fiscal_status)
            assert exc.value.detail == ValidationError({"fiscal_sponsor_name": [error_message]}).detail


class UserSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.included_rps = []
        self.not_included_rps = []
        for i in range(3):
            if i % 2 == 0:
                self.included_rps.append(RevenueProgramFactory(organization=self.organization))
            else:
                self.not_included_rps.append(RevenueProgramFactory())
        self.superuser_user = user_model.objects.create_superuser(email="superuser@test.com", password="password")
        self.hub_admin_user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        self.org_admin_user = create_test_user(
            role_assignment_data={"role_type": Roles.ORG_ADMIN, "organization": self.organization}
        )
        self.rp_admin_user = create_test_user(
            role_assignment_data={
                "role_type": Roles.RP_ADMIN,
                "organization": self.organization,
                "revenue_programs": self.included_rps,
            }
        )
        self.no_role_user = user_model.objects.create(email="no_role_user@test.com", password="password")

        self.serializer = serializers.UserSerializer

    def _get_serialized_data_for_user(self, user):
        return self.serializer(user).data

    def _ids_from_data(self, data):
        return [entity["id"] for entity in data]

    def _org_id_from_role(self, user):
        role_assignment = user.get_role_assignment()
        return role_assignment.organization.pk

    def _rp_ids_from_role(self, user):
        role_assignment = user.get_role_assignment()
        return list(role_assignment.revenue_programs.values_list("pk", flat=True))

    def test_has_expected_fields(self):
        expected_fields = {
            "accepted_terms_of_service",
            "email",
            "email_verified",
            "flags",
            "id",
            "organizations",
            "revenue_programs",
            "role_type",
        }
        data = self._get_serialized_data_for_user(self.org_admin_user)
        assert expected_fields == set(data.keys())
        assert len(data["revenue_programs"]) >= 1
        for rp in data["revenue_programs"]:
            assert set(rp.keys()) == set(RevenueProgramInlineSerializer().fields.keys())
        assert len(data["organizations"])
        for org in data["organizations"]:
            assert set(org["plan"].keys()) == set(asdict(Plan(name="", label="")).keys())

    def test_get_role_type(self):
        super_user_role = self._get_serialized_data_for_user(self.superuser_user)["role_type"]
        self.assertEqual(super_user_role, ("superuser", "Superuser"))

        hub_admin_role = self._get_serialized_data_for_user(self.hub_admin_user)["role_type"]
        self.assertEqual(hub_admin_role, (Roles.HUB_ADMIN, Roles.HUB_ADMIN.label))

        org_admin_role = self._get_serialized_data_for_user(self.org_admin_user)["role_type"]
        self.assertEqual(org_admin_role, (Roles.ORG_ADMIN, Roles.ORG_ADMIN.label))

        rp_admin_role = self._get_serialized_data_for_user(self.rp_admin_user)["role_type"]
        self.assertEqual(rp_admin_role, (Roles.RP_ADMIN, Roles.RP_ADMIN.label))

    def test_get_permitted_organizations(self):
        super_user_data = self._get_serialized_data_for_user(self.superuser_user)
        su_org_ids = self._ids_from_data(super_user_data["organizations"])
        assert set(su_org_ids) == set(list(Organization.objects.values_list("pk", flat=True)))

        hub_admin_data = self._get_serialized_data_for_user(self.hub_admin_user)
        ha_org_ids = self._ids_from_data(hub_admin_data["organizations"])
        self.assertEqual(ha_org_ids, list(Organization.objects.values_list("pk", flat=True)))

        org_admin_data = self._get_serialized_data_for_user(self.org_admin_user)
        oa_org_ids = self._ids_from_data(org_admin_data["organizations"])
        self.assertEqual(len(oa_org_ids), 1)
        self.assertEqual(oa_org_ids[0], self._org_id_from_role(self.org_admin_user))

        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rp_org_ids = self._ids_from_data(rp_admin_data["organizations"])
        self.assertEqual(len(rp_org_ids), 1)
        self.assertEqual(rp_org_ids[0], self._org_id_from_role(self.rp_admin_user))

    def test_get_permitted_revenue_programs(self):
        super_user_data = self._get_serialized_data_for_user(self.superuser_user)
        su_rp_ids = self._ids_from_data(super_user_data["revenue_programs"])
        self.assertEqual(su_rp_ids, list(RevenueProgram.objects.values_list("pk", flat=True)))

        hub_admin_data = self._get_serialized_data_for_user(self.hub_admin_user)
        ha_rp_ids = self._ids_from_data(hub_admin_data["revenue_programs"])
        self.assertEqual(ha_rp_ids, list(RevenueProgram.objects.values_list("pk", flat=True)))

        org_admin_data = self._get_serialized_data_for_user(self.org_admin_user)
        oa_rp_ids = self._ids_from_data(org_admin_data["revenue_programs"])
        org_admin_expected_rps = self.org_admin_user.get_role_assignment().organization.revenueprogram_set.all()
        self.assertEqual(len(oa_rp_ids), org_admin_expected_rps.count())
        self.assertEqual(oa_rp_ids, list(org_admin_expected_rps.values_list("pk", flat=True)))

        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rp_rp_ids = self._ids_from_data(rp_admin_data["revenue_programs"])
        self.assertEqual(len(rp_rp_ids), len(self.included_rps))
        self.assertEqual(rp_rp_ids, self._rp_ids_from_role(self.rp_admin_user))
        self.assertEqual(set(rp_rp_ids), set(rp.id for rp in self.included_rps))

    def test_no_role_user(self):
        no_role_data = self._get_serialized_data_for_user(self.no_role_user)
        self.assertIsNone(no_role_data["role_type"])
        # We want empty lists here, specifically
        self.assertTrue(no_role_data["organizations"] == [])
        self.assertTrue(no_role_data["revenue_programs"] == [])

        # But we do expect the other data
        self.assertEqual(self.no_role_user.pk, no_role_data["id"])
        self.assertEqual(self.no_role_user.email, no_role_data["email"])

    def test_listed_revenue_programs_include_org_objects(self):
        """
        The front-end uses the RevenueProgram.organization.pk for some simple filtering. Ensure that it is present.
        """
        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rps = rp_admin_data["revenue_programs"]
        # An "organization" field should be present
        self.assertTrue(all([True for rp in rps if "organization" in rp]))
        org_objects = [rp["organization"] for rp in rps]
        expected_org_objects = [OrganizationInlineSerializer(rp.organization).data for rp in self.included_rps]
        self.assertEqual(org_objects, expected_org_objects)

    def test_empty_results(self):
        not_a_user_instance = mock.Mock()
        assert None is serializers.UserSerializer({}).get_role_type(not_a_user_instance)
        assert [] == serializers.UserSerializer({}).get_permitted_organizations(not_a_user_instance)
        assert [] == serializers.UserSerializer({}).get_permitted_revenue_programs(not_a_user_instance)
        assert [] == serializers.UserSerializer({}).get_active_flags_for_user(not_a_user_instance)


@pytest.mark.parametrize(
    (
        "flag1_everyone",
        "flag1_superusers",
        "flag1_add_user",
        "flag2_everyone",
        "flag2_superusers",
        "flag2_add_user",
        "user_under_test",
        "expect_flag1",
        "expect_flag2",
    ),
    [
        (True, False, False, False, False, False, "superuser", True, False),
        (True, False, False, False, False, False, "hub_admin", True, False),
        (False, True, False, False, False, False, "superuser", True, False),
        (False, True, False, False, False, False, "hub_admin", False, False),
        (False, False, True, False, False, False, "hub_admin", True, False),
    ],
)
@pytest.mark.django_db
def test_user_serializer_flags(
    flag1_everyone,
    flag1_superusers,
    flag1_add_user,
    flag2_everyone,
    flag2_superusers,
    flag2_add_user,
    user_under_test,
    expect_flag1,
    expect_flag2,
):
    user = {
        "superuser": user_model.objects.create_superuser(email="test@test.com", password="testing"),
        "hub_admin": create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN}),
    }[user_under_test]
    Flag = get_waffle_flag_model()

    flag1 = Flag.objects.create(name="flag1", everyone=flag1_everyone, superusers=flag1_superusers)
    if flag1_add_user:
        flag1.users.add(user)
        flag1.save()

    flag2 = Flag.objects.create(name="flag2", everyone=flag2_everyone, superusers=flag2_superusers)
    if flag2_add_user:
        flag2.users.add(user)
        flag2.save()

    request = APIRequestFactory().get("/")
    request.user = user
    data = serializers.UserSerializer(user, context={"request": request}).data
    expected_flag_count = sum([x for x in [expect_flag1, expect_flag2] if x])
    assert len(data["flags"]) == expected_flag_count
    flags = [(flag["name"], flag["id"]) for flag in data["flags"]]
    if expect_flag1:
        assert (flag1.name, flag1.id) in flags
    if not expect_flag1:
        assert (flag1.name, flag1.id) not in flags
    if expect_flag2:
        assert (flag2.name, flag2.id) in flags
    if not expect_flag2:
        assert (flag2.name, flag2.id) not in flags
