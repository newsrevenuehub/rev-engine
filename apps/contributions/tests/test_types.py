import pytest

from apps.contributions.types import (
    StripeMetadataSchemaBase,
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
    with pytest.raises(ValueError):
        cast_metadata_to_stripe_payment_metadata_schema(unknown_metadata_version)
