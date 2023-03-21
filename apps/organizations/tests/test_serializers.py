import pytest

from apps.organizations.serializers import RevenueProgramSerializer
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
def test_revenueprogramserializer():
    fields = (
        "id",
        "name",
        "slug",
        "tax_id",
        "fiscal_status",
        "fiscal_sponsor_name",
        "mailchimp_integration_connected",
        "mailchimp_email_lists",
    )
    rp = RevenueProgramFactory()
    serialized = RevenueProgramSerializer(rp).data
    for field in fields:
        assert serialized[field] == getattr(rp, field)
