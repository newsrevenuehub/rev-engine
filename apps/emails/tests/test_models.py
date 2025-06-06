import datetime
import typing

import pytest
import pytest_mock

from apps.emails.models import EmailCustomization, TransactionalEmailRecord
from apps.organizations.models import RevenueProgram


if typing.TYPE_CHECKING:
    from apps.contributions.models import Contribution


@pytest.mark.django_db
class TestEmailCustomization:

    @pytest.fixture
    def customization(self, revenue_program: RevenueProgram) -> EmailCustomization:
        """Fixture to create a default EmailCustomization instance."""
        return EmailCustomization.objects.create(
            content_html="<p>Test content</p>",
            email_type="test_email",
            email_block="test_block",
            revenue_program=revenue_program,
        )

    def test_save_removes_unexpected_html_tags(self, customization: EmailCustomization):
        customization.content_html = "<script>not allowed</script><b>OK</b>"
        customization.save()
        assert customization.content_html == "<b>OK</b>"

    def test_save_removes_unexpected_html_attributes(self, customization: EmailCustomization):
        customization.content_html = '<b onclick="doEvil()">should be pruned</b>'
        customization.save()
        assert customization.content_html == "<b>should be pruned</b>"

    def test_plain_text_conversion(self, customization: EmailCustomization):
        customization.content_html = """
          <p><b>Bold</b> <i>Italic</i> <s>Strike</s> <u>Underline</u></p>
          <ol>
            <li>One</li>
            <li>Two</li>
          </ol>
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
          <p>Second paragraph</p>
        """
        assert customization.content_plain_text == "\n".join(  # noqa: FLY002 need exact line breaks w/o indentation
            (
                "**Bold** *Italic* ~~Strike~~ Underline",
                "",
                "1. One",
                "2. Two",
                "",
                "* One",
                "* Two",
                "",
                "Second paragraph",
            )
        )


@pytest.mark.django_db
class TestTransactionalEmailRecord:

    @pytest.fixture
    def transactional_email_record_receipt_email(
        self, one_time_contribution: "Contribution"
    ) -> TransactionalEmailRecord:
        """Fixture to create a default TransactionalEmailRecord instance."""
        record = TransactionalEmailRecord(
            contribution=one_time_contribution,
            name=EmailCustomization.EmailTypes.CONTRIBUTION_RECEIPT,
            sent_on=datetime.datetime.now(tz=datetime.timezone.utc),
        )
        record.save()
        return record

    @pytest.fixture
    def _mock_stripe_retrieve(self, mocker: pytest_mock.MockerFixture):
        """Mock the Stripe retrieve method."""
        mocker.patch("stripe.Customer.retrieve")

    @pytest.mark.usefixtures("_mock_stripe_retrieve")
    def test_handle_receipt_email_when_unsent(self, one_time_contribution: "Contribution"):
        query = TransactionalEmailRecord.objects.filter(
            contribution=one_time_contribution,
            name=EmailCustomization.EmailTypes.CONTRIBUTION_RECEIPT,
        )
        assert not query.exists()
        TransactionalEmailRecord.handle_receipt_email(one_time_contribution)
        assert query.exists()

    def test_handle_receipt_email_when_already_sent(
        self, transactional_email_record_receipt_email: TransactionalEmailRecord
    ):
        query = TransactionalEmailRecord.objects.filter(
            contribution=transactional_email_record_receipt_email.contribution,
            name=EmailCustomization.EmailTypes.CONTRIBUTION_RECEIPT,
        )
        assert query.exists()
        TransactionalEmailRecord.handle_receipt_email(
            contribution=transactional_email_record_receipt_email.contribution
        )
        assert query.count() == 1
