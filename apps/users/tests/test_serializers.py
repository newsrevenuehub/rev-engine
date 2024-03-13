import datetime

from django.contrib.auth import get_user_model

import dateparser
import pytest
import pytz
from rest_framework.serializers import ValidationError

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

    def test_create_override(self, valid_customize_account_data, user_with_verified_email_and_tos_accepted, mocker):
        mocker.patch(
            "apps.users.serializers.CustomizeAccountSerializer.context",
            {"user": user_with_verified_email_and_tos_accepted},
        )
        user_save_spy = mocker.spy(user_with_verified_email_and_tos_accepted, "save")
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


@pytest.mark.django_db
class TestFlagSerializer:
    def test_has_expected_fields_and_values(self, default_feature_flags):
        flag = default_feature_flags[0][0]
        data = serializers.FlagSerializer(flag).data
        assert set(data.keys()) == {"id", "name"}
        assert data["id"] == flag.id
        assert data["name"] == flag.name


@pytest.mark.django_db
class TestAuthedUserSerializer:

    @pytest.fixture(
        params=[
            "superuser",
            "hub_admin_user",
            "org_user_free_plan",
            "rp_user",
            "user_with_verified_email_and_tos_accepted",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_has_expected_fields_and_values(self, user):
        data = serializers.AuthedUserSerializer(user).data
        assert set(data.keys()) == {
            "accepted_terms_of_service",
            "email",
            "email_verified",
            "flags",
            "id",
            "organizations",
            "revenue_programs",
            "role_type",
        }
        if user.accepted_terms_of_service:
            assert dateparser.parse(data["accepted_terms_of_service"]) == pytz.utc.localize(
                user.accepted_terms_of_service
            )
        assert data["email"] == user.email
        assert data["email_verified"] == user.email_verified
        assert data["id"] == str(user.id)
        assert data["role_type"] == user.role_type

        assert len(data["flags"]) == user.active_flags.count()
        assert len(data["organizations"]) == user.permitted_organizations.count()
        assert len(data["revenue_programs"]) == user.permitted_revenue_programs.count()

        for flag in data["flags"]:
            assert flag == serializers.FlagSerializer(flag).data
        for org in data["organizations"]:
            assert org == OrganizationInlineSerializer(Organization.objects.get(id=org["id"])).data
        for rp in data["revenue_programs"]:
            assert rp == RevenueProgramInlineSerializer(RevenueProgram.objects.get(id=rp["id"])).data

    def test_all_fields_are_read_only(self):
        serializers.AuthedUserSerializer.Meta.fields == serializers.AuthedUserSerializer.Meta.read_only_fields


@pytest.fixture
def valid_create_data_for_muteable_user_serializer():
    return {
        "email": "foo@bar.com",
        "password": "supersecurepassword199719997!!!",
        "accepted_terms_of_service": datetime.datetime.utcnow(),
    }


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_no_password(valid_create_data_for_muteable_user_serializer):
    data = {**valid_create_data_for_muteable_user_serializer}
    del data["password"]
    return data


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_password_null(valid_create_data_for_muteable_user_serializer):
    return {**valid_create_data_for_muteable_user_serializer, "password": None}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_password_empty_string(
    valid_create_data_for_muteable_user_serializer,
):
    return {**valid_create_data_for_muteable_user_serializer, "password": ""}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_password_too_short(
    valid_create_data_for_muteable_user_serializer,
):
    return {**valid_create_data_for_muteable_user_serializer, "password": "a" * 7}


@pytest.fixture(
    params=[
        "invalid_create_data_for_muteable_user_serializer_no_password",
        "invalid_create_data_for_muteable_user_serializer_password_null",
        "invalid_create_data_for_muteable_user_serializer_password_empty_string",
        "invalid_create_data_for_muteable_user_serializer_password_too_short",
    ]
)
def invalid_create_data_for_muteable_user_serializer_because_of_password(request):
    return request.getfixturevalue(request.param)


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_no_email_field(valid_create_data_for_muteable_user_serializer):
    data = {**valid_create_data_for_muteable_user_serializer}
    del data["email"]
    return data


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_email_null(valid_create_data_for_muteable_user_serializer):
    return {**valid_create_data_for_muteable_user_serializer, "email": None}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_email_empty_string(
    valid_create_data_for_muteable_user_serializer,
):
    return {**valid_create_data_for_muteable_user_serializer, "email": ""}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_email_invalid(valid_create_data_for_muteable_user_serializer):
    return {**valid_create_data_for_muteable_user_serializer, "email": "not-email-address1111"}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_email_taken(
    valid_create_data_for_muteable_user_serializer, user_with_verified_email_and_tos_accepted
):
    return {**valid_create_data_for_muteable_user_serializer, "email": user_with_verified_email_and_tos_accepted.email}


@pytest.fixture(
    params=[
        "invalid_create_data_for_muteable_user_serializer_no_email_field",
        "invalid_create_data_for_muteable_user_serializer_email_null",
        "invalid_create_data_for_muteable_user_serializer_email_empty_string",
        "invalid_create_data_for_muteable_user_serializer_email_invalid",
        "invalid_create_data_for_muteable_user_serializer_email_taken",
    ],
)
def invalid_create_data_for_muteable_user_serializer_because_of_email(request):
    return request.getfixturevalue(request.param)


@pytest.fixture(
    params=[
        "invalid_create_data_for_muteable_user_serializer_email_null",
        "invalid_create_data_for_muteable_user_serializer_email_empty_string",
        "invalid_create_data_for_muteable_user_serializer_email_invalid",
        "invalid_create_data_for_muteable_user_serializer_email_taken",
    ]
)
def invalid_update_data_for_muteable_user_serializer_because_of_email(request):
    return {"email": request.getfixturevalue(request.param)["email"]}


@pytest.fixture(
    params=[
        "invalid_create_data_for_muteable_user_serializer_password_null",
        "invalid_create_data_for_muteable_user_serializer_password_empty_string",
        "invalid_create_data_for_muteable_user_serializer_password_too_short",
    ]
)
def invalid_update_data_for_muteable_user_serializer_because_of_password(request):
    return {"password": request.getfixturevalue(request.param)["password"]}


@pytest.fixture
def invalid_update_data_for_muteable_user_serializer_because_of_accepted_tos():
    return {"accepted_terms_of_service": None}


@pytest.fixture
def invalid_create_data_for_muteable_user_serializer_accepted_tos_missing(
    valid_create_data_for_muteable_user_serializer,
):
    data = {**valid_create_data_for_muteable_user_serializer}
    del data["accepted_terms_of_service"]
    return data


@pytest.fixture
def valid_update_data_for_muteable_user_serializer_email_field(valid_create_data_for_muteable_user_serializer):
    assert valid_create_data_for_muteable_user_serializer["email"] != (email := "bizz@bang.com")
    return {
        "email": email,
    }


@pytest.fixture
def valid_update_data_for_muteable_user_serializer_password_field(valid_create_data_for_muteable_user_serializer):
    return {"password": valid_create_data_for_muteable_user_serializer["password"][::-1]}


@pytest.fixture
def valid_update_data_for_muteable_user_serializer_accepted_tos_field(valid_create_data_for_muteable_user_serializer):
    return {
        "accepted_terms_of_service": valid_create_data_for_muteable_user_serializer["accepted_terms_of_service"]
        + datetime.timedelta(days=1)
    }


@pytest.fixture
def valid_update_data_all_fields(
    valid_update_data_for_muteable_user_serializer_email_field,
    valid_update_data_for_muteable_user_serializer_password_field,
    valid_update_data_for_muteable_user_serializer_accepted_tos_field,
):
    return (
        valid_update_data_for_muteable_user_serializer_email_field
        | valid_update_data_for_muteable_user_serializer_password_field
        | valid_update_data_for_muteable_user_serializer_accepted_tos_field
    )


@pytest.fixture(
    params=[
        "valid_update_data_for_muteable_user_serializer_email_field",
        "valid_update_data_for_muteable_user_serializer_password_field",
        "valid_update_data_for_muteable_user_serializer_accepted_tos_field",
        "valid_update_data_all_fields",
    ]
)
def valid_update_data(request):
    return request.getfixturevalue(request.param)


@pytest.mark.django_db
class TestMutableUserSerializer:
    def test_has_expected_readable_and_writable_fields(self):
        expected_read_only_fields = set(serializers._AUTHED_USER_FIELDS).difference(
            {"accepted_terms_of_service", "email"}
        )
        expected_writable_fields = {"email", "password", "accepted_terms_of_service"}
        actual_writable_fields = set(serializers.MutableUserSerializer.Meta.fields).difference(
            set(serializers.MutableUserSerializer.Meta.read_only_fields)
        )
        actual_read_only_fields = set(serializers.MutableUserSerializer.Meta.read_only_fields)
        assert actual_writable_fields == expected_writable_fields
        assert actual_read_only_fields == expected_read_only_fields
