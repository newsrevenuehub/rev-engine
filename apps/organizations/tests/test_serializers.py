import pytest

from apps.organizations.serializers import RevenueProgramSerializer


@pytest.mark.django_db
class TestRevenueProgramSerializer:
    def test_has_expected_fields_and_values(self, revenue_program):
        fields = (
            "id",
            "name",
            "slug",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
            "mailchimp_integration_connected",
            "mailchimp_email_lists",
            "mailchimp_list_id",
        )
        serialized = RevenueProgramSerializer(revenue_program).data
        for field in fields:
            assert serialized[field] == getattr(revenue_program, field)

    @pytest.mark.parametrize("is_owned", (True, False))
    def test_mailchimp_list_id_validation(self, is_owned, revenue_program, mocker, mailchimp_email_list_from_api):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            [
                mailchimp_email_list_from_api,
            ]
            if is_owned
            else [],
        )
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_integration_connected", True)
        serializer = RevenueProgramSerializer(
            revenue_program, data={"mailchimp_list_id": mailchimp_email_list_from_api["id"], "name": "something"}
        )
        if is_owned:
            assert serializer.is_valid()
            serializer.save()
            assert serializer.validated_data["mailchimp_list_id"] == mailchimp_email_list_from_api["id"]
        else:
            assert not serializer.is_valid()
            assert "Invalid Mailchimp list ID" in serializer.errors["mailchimp_list_id"]
