import pytest

from apps.contributions.exceptions import InvalidMetadataError
from apps.contributions.types import (
    StripeMetadataSchemaBase,
    StripePaymentMetadataSchemaV1_0,
    StripePaymentMetadataSchemaV1_1,
    StripePaymentMetadataSchemaV1_2,
    StripePaymentMetadataSchemaV1_3,
    StripePaymentMetadataSchemaV1_4,
    StripePaymentMetadataSchemaV1_5,
    cast_metadata_to_stripe_payment_metadata_schema,
)


class TestStripeMetadataSchemaBase:
    @pytest.fixture
    def schema(self):
        class Schema(StripeMetadataSchemaBase):
            schema_version: str = "1.4"
            source: str = "rev-engine"
            foo: str
            bar: str | None = None

        return Schema

    def test_truncate_strings(self, schema):
        over_limit = 501 * "a"
        instance = schema(foo=over_limit)
        assert len(instance.foo) == 500
        assert instance.bar is None


@pytest.fixture
def unknown_metadata_version(valid_metadata):
    return valid_metadata | {"schema_version": "foo.bar"}


def test_cast_metadata_to_stripe_payment_metadata_schema(valid_metadata, unknown_metadata_version):
    assert cast_metadata_to_stripe_payment_metadata_schema(valid_metadata)
    with pytest.raises(InvalidMetadataError):
        cast_metadata_to_stripe_payment_metadata_schema(unknown_metadata_version)


class TestStripePaymentMetadataSchemas:

    @pytest.fixture
    def v1_0_data(self):
        return {
            "agreed_to_pay_fees": "True",
            "comp_subscription": "bar",
            "company_name": "quux",
            "contributor_id": "123",
            "donor_selected_amount": 100.0,
            "honoree": "baz",
            "in_memory_of": "qux",
            "reason_for_giving": "because",
            "referer": "https://example.com",
            "revenue_program_id": "1",
            "revenue_program_slug": "foo",
            "schema_version": "1.0",
            "sf_campaign_id": "2",
            "source": "rev-engine",
            "swag_opt_out": "False",
            "t_shirt_size": "M",
        }

    @pytest.fixture
    def v1_1_data(self, v1_0_data):
        return v1_0_data | {"schema_version": "1.1"}

    @pytest.fixture
    def v1_2_data(self):
        return {
            "agreed_to_pay_fees": "True",
            "amount": 100,
            "donor_selected_amount": 100.0,
            "frequency": "monthly",
            "reason_for_giving": "because",
            "referer": "https://example.com",
            "revenue_program_id": "1",
            "revenue_program_slug": "foo",
            "schema_version": "1.2",
            "sf_campaign_id": "2",
            "source": "newspack",
        }

    @pytest.fixture
    def v1_3_data(self):
        return {
            "agreed_to_pay_fees": "True",
            "recurring_donation_id": "123",
            "revenue_program_id": "1",
            "revenue_program_slug": "foo",
            "schema_version": "1.3",
            "source": "legacy-migration",
        }

    @pytest.fixture
    def v1_4_data(self):
        return {
            "agreed_to_pay_fees": "True",
            "comp_subscription": "bar",
            "company_name": "quux",
            "contributor_id": "123",
            "donor_selected_amount": 100.0,
            "honoree": "baz",
            "in_memory_of": "qux",
            "reason_for_giving": "because",
            "referer": "https://example.com",
            "revenue_program_id": "1",
            "revenue_program_slug": "foo",
            "schema_version": "1.4",
            "sf_campaign_id": "2",
            "source": "rev-engine",
            "swag_opt_out": "False",
            "swag_choices": "hat;shirt;hoodie;",
        }

    @pytest.fixture
    def v1_5_data(self, v1_4_data):
        data = v1_4_data | {
            "schema_version": "1.5",
            "source": "external-migration",
            "external_id": "123",
            "recurring_donation_id": "456",
        }
        del data["contributor_id"]
        return data

    @pytest.fixture(
        params=[
            ("v1_0_data", StripePaymentMetadataSchemaV1_0),
            ("v1_1_data", StripePaymentMetadataSchemaV1_1),
            ("v1_2_data", StripePaymentMetadataSchemaV1_2),
            ("v1_3_data", StripePaymentMetadataSchemaV1_3),
            ("v1_4_data", StripePaymentMetadataSchemaV1_4),
            ("v1_5_data", StripePaymentMetadataSchemaV1_5),
        ],
    )
    def metadata_test_case(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1]

    def test_metadata_schemas(self, metadata_test_case):
        data, schema = metadata_test_case
        assert schema(**data)
