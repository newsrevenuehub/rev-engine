import pytest

from apps.contributions.types import StripeMetadataSchemaBase


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
