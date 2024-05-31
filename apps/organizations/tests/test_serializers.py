from dataclasses import asdict
from random import choice

import pytest
from faker import Faker

from apps.organizations.models import MailchimpProduct, MailchimpSegment, MailchimpStore
from apps.organizations.serializers import (
    MailchimpRevenueProgramForSpaConfiguration,
    MailchimpRevenueProgramForSwitchboard,
    OrganizationInlineSerializer,
    RevenueProgramSerializer,
)
from conftest import make_mock_mailchimp_email_list


faker = Faker()


@pytest.fixture()
def mailchimp_email_lists():
    return [make_mock_mailchimp_email_list()]


@pytest.fixture()
def mailchimp_store():
    return MailchimpStore(
        id=faker.uuid4(),
        list_id=faker.uuid4(),
        name=faker.word(),
        platform="",
        domain="",
        is_syncing=False,
        email_address=faker.email(),
        currency_code="",
        money_format="",
        primary_locale="",
        timezone="",
        phone="",
        address={},
        connected_site={},
        automations={},
        list_is_active=True,
        created_at="",
        updated_at="",
        _links=[],
    )


@pytest.fixture()
def mailchimp_product():
    return MailchimpProduct(
        id=faker.uuid4(),
        currency_code="",
        title="",
        handle="",
        url="",
        description="",
        type="",
        vendor="",
        image_url="",
        variants=[],
        images=[],
        published_at_foreign="",
        _links=[],
    )


@pytest.fixture()
def mailchimp_segment():
    return MailchimpSegment(
        id=faker.uuid4(),
        name=faker.word(),
        member_count=10,
        type=choice(["static", "saved", "fuzzy"]),
        created_at="",
        updated_at="",
        options={},
        list_id="",
        _links=[],
    )


EXPECTED_ORGANIZATION_INLINE_SERIALIZER_FIELDS = {
    "id",
    "uuid",
    "name",
    "slug",
    "plan",
    "show_connected_to_slack",
    "show_connected_to_salesforce",
    "show_connected_to_mailchimp",
    "send_receipt_email_via_nre",
}


@pytest.mark.django_db()
class TestOrganizationInlineSerializer:
    def test_has_right_fields(self, organization):
        assert (
            set(OrganizationInlineSerializer(organization).data.keys())
            == EXPECTED_ORGANIZATION_INLINE_SERIALIZER_FIELDS
        )


@pytest.mark.django_db()
class TestRevenueProgramSerializer:
    def test_has_right_fields_and_values(
        self,
        mc_connected_rp,
    ):
        serialized = RevenueProgramSerializer(mc_connected_rp).data
        for field in (
            "id",
            "name",
            "slug",
            "tax_id",
            "fiscal_status",
            "fiscal_sponsor_name",
        ):
            assert serialized[field] == getattr(mc_connected_rp, field)

    def test_update_override_has_update_fields_in_save(self, revenue_program, mocker):
        save_spy = mocker.patch("apps.organizations.models.RevenueProgram.save")
        data = {"slug": "something-made-up", "name": "something"}
        serializer = RevenueProgramSerializer(revenue_program)
        serializer.update(revenue_program, data)
        save_spy.assert_called_once_with(update_fields=set(data.keys()))


@pytest.mark.django_db()
class TestMailchimpRevenueProgramForSpaConfiguration:
    def test_has_right_fields_and_values(self, mc_connected_rp, mocker, mailchimp_email_list_from_api):
        mock_get_client = mocker.patch("apps.organizations.models.RevenueProgram.get_mailchimp_client")
        mock_get_client.return_value.lists.get_list.return_value = mailchimp_email_list_from_api
        mock_get_client.return_value.lists.get_all_lists.return_value = {"lists": [mailchimp_email_list_from_api]}
        mc_connected_rp.mailchimp_list_id = mailchimp_email_list_from_api["id"]
        mc_connected_rp.save()
        serializer = MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp)
        serialized_data = serializer.data
        for field in (
            "id",
            "name",
            "slug",
            "mailchimp_integration_connected",
            "mailchimp_list_id",
        ):
            assert serialized_data[field] == getattr(mc_connected_rp, field)
        assert serialized_data["chosen_mailchimp_email_list"] == mailchimp_email_list_from_api
        assert serialized_data["available_mailchimp_email_lists"] == [mailchimp_email_list_from_api]

    def test_update_override_has_update_fields_in_save(self, mc_connected_rp, mocker, mailchimp_email_list):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=[mailchimp_email_list],
            new_callable=mocker.PropertyMock,
        )
        save_spy = mocker.patch("apps.organizations.models.RevenueProgram.save")
        data = {"mailchimp_list_id": mailchimp_email_list.id, "name": "something"}
        serializer = MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp, data=data)
        assert serializer.is_valid(raise_exception=True) is True
        serializer.update(mc_connected_rp, data)
        save_spy.assert_called_once_with(update_fields=set(data.keys()))

    def test_validate_mailchimp_list_id(self, mc_connected_rp, mocker, mailchimp_email_list):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=[mailchimp_email_list],
            new_callable=mocker.PropertyMock,
        )
        data = {"mailchimp_list_id": "something-made-up", "name": "something"}
        serializer = MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp, data=data)
        assert serializer.is_valid() is False
        assert "mailchimp_list_id" in serializer.errors

    def test_validate_mailchimp_list_id_can_set_to_none(self, mc_connected_rp, mocker, mailchimp_email_list):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=[mailchimp_email_list],
            new_callable=mocker.PropertyMock,
        )
        mc_connected_rp.mailchimp_list_id = mailchimp_email_list.id
        mc_connected_rp.save()
        data = {"mailchimp_list_id": None, "name": "something"}
        serializer = MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp, data=data)
        assert serializer.is_valid() is True
        assert serializer.validated_data["mailchimp_list_id"] is None


@pytest.mark.django_db()
class TestMailchimpRevenueProgramForSwitchboard:
    def test_has_right_fields_and_values(
        self,
        mailchimp_store,
        mailchimp_product,
        mocker,
        mc_connected_rp,
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_store",
            return_value=mailchimp_store,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contribution_product",
            return_value=mailchimp_product,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_segment",
            return_value=mailchimp_segment,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_one_time_contribution_product",
            return_value=mailchimp_product,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_contributor_segment",
            return_value=mailchimp_segment,
            new_callable=mocker.PropertyMock,
        )
        serialized = MailchimpRevenueProgramForSwitchboard(mc_connected_rp).data
        assert set(serialized.keys()) == {
            "id",
            "name",
            "slug",
            "mailchimp_server_prefix",
            "mailchimp_integration_connected",
            "stripe_account_id",
            "mailchimp_store",
            "mailchimp_recurring_contribution_product",
            "mailchimp_one_time_contribution_product",
        }

        for field in (
            "id",
            "name",
            "slug",
            "mailchimp_server_prefix",
            "mailchimp_integration_connected",
            "stripe_account_id",
        ):
            assert serialized[field] == getattr(mc_connected_rp, field)
        assert serialized["mailchimp_store"] == asdict(mailchimp_store)
        assert serialized["mailchimp_recurring_contribution_product"] == asdict(mailchimp_product)
        assert serialized["mailchimp_one_time_contribution_product"] == asdict(mailchimp_product)

    def test_stripe_account_id_is_nullable(self, mc_connected_rp):
        mc_connected_rp.payment_provider.stripe_account_id = None
        mc_connected_rp.payment_provider.save()
        assert mc_connected_rp.stripe_account_id is None
        serialized = MailchimpRevenueProgramForSwitchboard(mc_connected_rp).data
        assert serialized["stripe_account_id"] is None
