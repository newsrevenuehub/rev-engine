from dataclasses import asdict

import pytest

from apps.organizations.serializers import RevenueProgramSerializer


@pytest.mark.django_db
class TestRevenueProgramSerializer:
    def test_has_right_fields_and_values(self, mocker, mailchimp_email_list, mc_connected_rp):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=[mailchimp_email_list],
            new_callable=mocker.PropertyMock,
        )
        serialized = RevenueProgramSerializer(mc_connected_rp).data
        for field in (
            "id",
            "name",
            "slug",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
            "mailchimp_integration_connected",
        ):
            assert serialized[field] == getattr(mc_connected_rp, field)
        assert len(serialized["mailchimp_email_lists"]) == 1
        assert isinstance(serialized["mailchimp_email_lists"][0], dict)
        assert serialized["mailchimp_email_lists"][0] == asdict(mailchimp_email_list)
