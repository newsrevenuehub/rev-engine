from django.contrib.auth import get_user_model

import pytest
import pytest_cases
from rest_framework.serializers import ValidationError
from waffle import get_waffle_flag_model

from apps.common.tests.test_resources import DEFAULT_FLAGS_CONFIG_MAPPING
from apps.organizations.models import (
    FISCAL_SPONSOR_NAME_MAX_LENGTH,
    FiscalStatusChoices,
    Organization,
    OrgNameNonUniqueError,
    PaymentProvider,
    RevenueProgram,
)
from apps.organizations.serializers import (
    OrganizationInlineSerializer,
    RevenueProgramInlineSerializer,
)
from apps.users import serializers
from apps.users.choices import Roles
from apps.users.constants import FIRST_NAME_MAX_LENGTH, JOB_TITLE_MAX_LENGTH, LAST_NAME_MAX_LENGTH
from apps.users.models import RoleAssignment
from apps.users.serializers import UserSerializer


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


@pytest.fixture
def flag_everyone():
    Flag = get_waffle_flag_model()
    return Flag.objects.create(name="flag_everyone", everyone=True, superusers=False)


@pytest.fixture
def flag_superusers():
    Flag = get_waffle_flag_model()
    return Flag.objects.create(name="flag_superusers", everyone=False, superusers=True)


@pytest.fixture
def flag_for_user(user_with_verified_email_and_tos_accepted):
    Flag = get_waffle_flag_model()
    flag = Flag.objects.create(name="flag_for_user", everyone=False, superusers=False)
    flag.users.add(user_with_verified_email_and_tos_accepted)
    flag.save()
    return flag


@pytest.fixture
def flag_for_user_plus_superuser(user_with_verified_email_and_tos_accepted, superuser):
    Flag = get_waffle_flag_model()
    flag = Flag.objects.create(name="flag_for_user_plus_superuser", everyone=False, superusers=True)
    flag.users.add(user_with_verified_email_and_tos_accepted)
    flag.users.add(superuser)
    flag.save()
    return flag


@pytest.fixture
def expected_flags_for_superuser(flag_everyone, flag_superusers, flag_for_user_plus_superuser):
    return [flag_everyone, flag_superusers, flag_for_user_plus_superuser]


@pytest.fixture
def expected_flags_for_user(flag_everyone, flag_for_user):
    return [flag_everyone, flag_for_user]


@pytest.fixture
def expected_flags_for_user_no_role_assignment(flag_everyone):
    return [flag_everyone]


@pytest.fixture
def suppress_default_feature_flags():
    Flag = get_waffle_flag_model()
    Flag.objects.filter(name__in=DEFAULT_FLAGS_CONFIG_MAPPING.keys()).delete()


@pytest.mark.django_db
class TestUserSerializer:
    @pytest_cases.parametrize(
        "user, expected_flag_names",
        (
            (
                pytest_cases.fixture_ref("user_with_verified_email_and_tos_accepted"),
                {"flag_everyone", "flag_for_user", "flag_for_user_plus_superuser"},
            ),
            (
                pytest_cases.fixture_ref("superuser"),
                {"flag_everyone", "flag_superusers", "flag_for_user_plus_superuser"},
            ),
            (
                pytest_cases.fixture_ref("user_no_role_assignment"),
                {"flag_everyone"},
            ),
        ),
    )
    def test_get_active_flags_for_user(
        self,
        user,
        expected_flag_names,
        flag_everyone,
        flag_for_user,
        flag_for_user_plus_superuser,
        flag_superusers,
        suppress_default_feature_flags,
    ):
        flags = UserSerializer().get_active_flags_for_user(user)
        assert {flag["name"] for flag in flags} == expected_flag_names

    def test_has_expected_fields_and_values(self, org_user_free_plan, mocker):
        mocker.patch(
            "apps.users.serializers.UserSerializer.context",
            {"revenue_programs": org_user_free_plan.roleassignment.revenue_programs.all()},
        )
        serializer = UserSerializer(org_user_free_plan)
        assert serializer.data["id"] == org_user_free_plan.pk
        assert serializer.data["accepted_terms_of_service"] == org_user_free_plan.accepted_terms_of_service
        assert serializer.data["email"] == org_user_free_plan.email
        assert serializer.data["email_verified"] == org_user_free_plan.email_verified
        assert "flags" in serializer.data
        assert set([x["id"] for x in serializer.data["organizations"]]) == set(
            list(org_user_free_plan.organizations.values_list("pk", flat=True))
        )
        assert set([x["id"] for x in serializer.data["revenue_programs"]]) == set(
            list(org_user_free_plan.roleassignment.revenue_programs.values_list("pk", flat=True))
        )
        for x in serializer.data["organizations"]:
            assert x == OrganizationInlineSerializer(data=x).initial_data
        for x in serializer.data["revenue_programs"]:
            assert x == RevenueProgramInlineSerializer(data=x).initial_data
        assert serializer.data["role_type"] == org_user_free_plan.get_role_type()
        assert "password" not in serializer.data

    def test_when_no_role_assignment(self, user_no_role_assignment):
        serializer = UserSerializer(user_no_role_assignment)
        assert serializer.data["role_type"] is None
        assert serializer.data["organizations"] == []
        assert serializer.data["revenue_programs"] == []
        assert serializer.data["id"] == user_no_role_assignment.pk
        assert serializer.data["email"] == user_no_role_assignment.email
