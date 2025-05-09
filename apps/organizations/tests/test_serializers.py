from dataclasses import asdict
from random import choice

import pytest
import pytest_mock
from faker import Faker
from requests.exceptions import RequestException

from apps.organizations.models import (
    MailchimpEmailList,
    MailchimpProduct,
    MailchimpSegment,
    MailchimpStore,
    Organization,
    RevenueProgram,
)
from apps.organizations.serializers import (
    ActiveCampaignRevenueProgramForSpaSerializer,
    MailchimpRevenueProgramForSpaConfiguration,
    MailchimpRevenueProgramForSwitchboard,
    OrganizationInlineSerializer,
    OrganizationSwitchboardSerializer,
    RevenueProgramSerializer,
)
from conftest import make_mock_mailchimp_email_list


faker = Faker()


@pytest.fixture
def mailchimp_email_lists():
    return [make_mock_mailchimp_email_list()]


@pytest.fixture
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


@pytest.fixture
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


@pytest.fixture
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
    "show_connected_to_eventbrite",
    "show_connected_to_google_analytics",
    "show_connected_to_digestbuilder",
    "show_connected_to_newspack",
}


@pytest.mark.django_db
class TestOrganizationInlineSerializer:
    def test_has_right_fields(self, organization):
        assert (
            set(OrganizationInlineSerializer(organization).data.keys())
            == EXPECTED_ORGANIZATION_INLINE_SERIALIZER_FIELDS
        )


@pytest.mark.django_db
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
        save_spy.assert_called_once_with(update_fields={*data.keys(), "modified"})


@pytest.mark.django_db
class TestMailchimpRevenueProgramForSpaConfiguration:
    def test_has_right_fields_and_values(self, mc_connected_rp, mocker, mailchimp_email_list_from_api):
        mock_client = mocker.patch("apps.organizations.models.RevenueProgramMailchimpClient")
        mock_client.return_value.get_email_list.return_value = MailchimpEmailList(**mailchimp_email_list_from_api)
        mock_client.return_value.lists.get_all_lists.return_value = {"lists": [mailchimp_email_list_from_api]}
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
        save_spy.assert_called_once_with(update_fields={*data.keys(), "modified"})

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


@pytest.mark.django_db
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
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_contributors_segment",
            return_value=mailchimp_segment,
            new_callable=mocker.PropertyMock,
        )
        mocker.patch(
            "apps.organizations.mailchimp.RevenueProgramMailchimpClient.get_product",
            return_value=mailchimp_product,
        )
        serialized = MailchimpRevenueProgramForSwitchboard(mc_connected_rp).data
        assert set(serialized.keys()) == {
            "id",
            "name",
            "slug",
            "mailchimp_server_prefix",
            "mailchimp_integration_ready",
            "stripe_account_id",
            "mailchimp_store",
            "mailchimp_monthly_contribution_product",
            "mailchimp_yearly_contribution_product",
            "mailchimp_recurring_contribution_product",
            "mailchimp_one_time_contribution_product",
        }

        for field in (
            "id",
            "name",
            "slug",
            "mailchimp_server_prefix",
            "mailchimp_integration_ready",
            "stripe_account_id",
        ):
            assert serialized[field] == getattr(mc_connected_rp, field)
        assert serialized["mailchimp_store"] == asdict(mailchimp_store)
        for product in (
            "mailchimp_monthly_contribution_product",
            "mailchimp_yearly_contribution_product",
            "mailchimp_one_time_contribution_product",
            "mailchimp_recurring_contribution_product",
        ):
            assert serialized[product] == asdict(mailchimp_product)

    def test_stripe_account_id_is_nullable(self, mc_connected_rp):
        mc_connected_rp.payment_provider.stripe_account_id = None
        mc_connected_rp.payment_provider.save()
        assert mc_connected_rp.stripe_account_id is None
        serialized = MailchimpRevenueProgramForSwitchboard(mc_connected_rp).data
        assert serialized["stripe_account_id"] is None


@pytest.mark.django_db
class TestActiveCampaignRevenueProgramForSpaSerializer:
    def test_calling_save_creates_revision(self, revenue_program, mocker):
        create_revision = mocker.patch("reversion.create_revision")
        set_comment = mocker.patch("reversion.set_comment")
        mocker.patch(
            "apps.organizations.serializers.ActiveCampaignRevenueProgramForSpaSerializer._confirm_activecampaign_url_and_token",
            return_value=True,
        )
        serializer = ActiveCampaignRevenueProgramForSpaSerializer(
            instance=revenue_program,
            data={"activecampaign_server_url": "http://example.com", "activecampaign_access_token": "token"},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        create_revision.assert_called_once()
        set_comment.assert_called_once_with("Updated by ActiveCampaignRevenueProgramForSpaSerializer")

    @pytest.mark.parametrize("url_and_key_valid", [True, False])
    def test_validate(self, url_and_key_valid: bool, mocker: pytest_mock.MockerFixture):
        mocker.patch(
            "apps.organizations.serializers.ActiveCampaignRevenueProgramForSpaSerializer._confirm_activecampaign_url_and_token",
            return_value=url_and_key_valid,
        )
        serializer = ActiveCampaignRevenueProgramForSpaSerializer(
            data={"activecampaign_server_url": "http://example.com", "activecampaign_access_token": "token"}
        )
        assert serializer.is_valid() == url_and_key_valid
        if not url_and_key_valid:
            assert list(serializer.errors.keys()) == ["non_field_errors"]
            assert len(serializer.errors["non_field_errors"]) == 1
            assert str(serializer.errors["non_field_errors"][0]) == "Invalid ActiveCampaign URL or token"

    @pytest.mark.parametrize("status_code", [200, 403])
    def test__confirm_activecampaign_url_and_token_happy_path(
        self, mocker: pytest_mock.MockerFixture, revenue_program: RevenueProgram, status_code: int
    ):
        mocker.patch("requests.get", return_value=mocker.Mock(status_code=status_code))
        serializer = ActiveCampaignRevenueProgramForSpaSerializer(instance=revenue_program)
        assert serializer._confirm_activecampaign_url_and_token("http://example.com", "token") is (status_code == 200)

    def test__confirm_activecampaign_url_and_token_when_unexpected_error(
        self, mocker: pytest_mock.MockerFixture, revenue_program: RevenueProgram
    ):
        mocker.patch("requests.get", side_effect=RequestException())
        mock_logger = mocker.patch("apps.organizations.serializers.logger.exception")
        serializer = ActiveCampaignRevenueProgramForSpaSerializer(instance=revenue_program)
        assert serializer._confirm_activecampaign_url_and_token("http://example.com", "token") is False
        mock_logger.assert_called_once_with("Unexpected error confirming ActiveCampaign URL and token")


@pytest.mark.django_db
class TestOrganizationSwitchboardSerializer:
    def test_has_right_fields(self, organization: Organization):
        expected_fields = {"id", "name", "plan_name", "slug", "stripe_subscription_id"}
        serialized = OrganizationSwitchboardSerializer(organization).data
        assert set(serialized.keys()) == expected_fields
        for field in expected_fields:
            assert serialized[field] == getattr(organization, field)
