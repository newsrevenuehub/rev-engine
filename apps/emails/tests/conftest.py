import pytest

from apps.emails.models import EmailCustomization
from apps.organizations.models import RevenueProgram


@pytest.fixture
def email_customization(revenue_program: RevenueProgram) -> EmailCustomization:
    """Fixture to create a default EmailCustomization instance."""
    return EmailCustomization.objects.create(
        content_html="<p>Test content</p>",
        email_type=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
        email_block=EmailCustomization.EmailBlock.MESSAGE,
        revenue_program=revenue_program,
    )
