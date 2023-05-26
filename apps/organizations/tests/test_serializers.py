from dataclasses import asdict
from random import choice

import pytest
from faker import Faker

from apps.organizations.models import MailchimpProduct, MailchimpSegment, MailchimpStore
from apps.organizations.serializers import RevenueProgramSerializer, logger
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


@pytest.mark.django_db
class TestRevenueProgramSerializer:
    def test_has_right_fields_and_values(
        self,
        mailchimp_store,
        mailchimp_product,
        mailchimp_segment,
        mailchimp_email_lists,
        mocker,
        mailchimp_email_list,
        mc_connected_rp,
    ):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=mailchimp_email_lists,
            new_callable=mocker.PropertyMock,
        )
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
            return_value=mailchimp_product,
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
        assert serialized["mailchimp_email_lists"][0] == {
            "id": mailchimp_email_lists[0].id,
            "name": mailchimp_email_lists[0].name,
        }
        assert serialized["mailchimp_store"] == asdict(mailchimp_store)

    def test_validate_mailchimp_list_id_when_valid(self, mailchimp_email_lists, mc_connected_rp, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=mailchimp_email_lists,
            new_callable=mocker.PropertyMock,
        )
        data = {"mailchimp_list_id": mailchimp_email_lists[0].id, "name": "something"}
        serializer = RevenueProgramSerializer(mc_connected_rp, data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["mailchimp_list_id"] == data["mailchimp_list_id"]

    def test_validate_mailchimp_list_id_when_invalid(self, mailchimp_email_lists, mc_connected_rp, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=mailchimp_email_lists,
            new_callable=mocker.PropertyMock,
        )
        data = {"mailchimp_list_id": "something-made-up", "name": "something"}
        serializer = RevenueProgramSerializer(mc_connected_rp, data=data)
        assert serializer.is_valid() is False
        assert "mailchimp_list_id" in serializer.errors
        logger_spy.assert_called_once_with("Attempt to set mailchimp_list_id to a list not associated with this RP")

    def test_validate_mailchimp_list_id_when_create(self, mc_connected_rp, mocker):
        logger_spy = mocker.spy(logger, "warning")
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_email_lists",
            return_value=[],
            new_callable=mocker.PropertyMock,
        )
        data = {"mailchimp_list_id": "something-made-up", "name": "something"}
        serializer = RevenueProgramSerializer(data=data)
        assert serializer.is_valid() is False
        assert "mailchimp_list_id" in serializer.errors
        logger_spy.assert_called_once_with("Attempt to set mailchimp_list_id on a new RP")
