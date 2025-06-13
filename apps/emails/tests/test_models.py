import datetime
import typing

import pytest
import pytest_mock

from apps.emails.models import EmailCustomization, TransactionalEmailRecord


if typing.TYPE_CHECKING:
    from apps.contributions.models import Contribution


@pytest.mark.django_db
class TestEmailCustomization:

    def test_save_removes_unexpected_html_tags(self, email_customization: EmailCustomization):
        email_customization.content_html = "<script>not allowed</script><b>OK</b>"
        email_customization.save()
        assert email_customization.content_html == "<b>OK</b>"

    def test_save_removes_unexpected_html_attributes(self, email_customization: EmailCustomization):
        email_customization.content_html = '<b onclick="doEvil()">should be pruned</b>'
        email_customization.save()
        assert email_customization.content_html == "<b>should be pruned</b>"

    def test_plain_text_conversion(self, email_customization: EmailCustomization):
        email_customization.content_html = """
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
        assert (
            email_customization.content_plain_text
            == "\n".join(  # noqa: FLY002 need exact line breaks w/o indentation
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
            name=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
            sent_on=datetime.datetime.now(tz=datetime.timezone.utc),
        )
        record.save()
        return record

    @pytest.fixture
    def _mock_stripe_retrieve(self, mocker: pytest_mock.MockerFixture):
        """Mock the Stripe retrieve method."""
        mocker.patch("stripe.Customer.retrieve")

    @pytest.fixture
    def now(self, mocker: pytest_mock.MockerFixture) -> datetime.datetime:
        """Fixture to provide the current time."""
        fixed_time = datetime.datetime(2025, 1, 1, 1, 1, 1, tzinfo=datetime.timezone.utc)
        dt_module = mocker.patch("apps.emails.models.datetime")
        dt_module.datetime.now.return_value = fixed_time
        return fixed_time

    @pytest.mark.usefixtures("_mock_stripe_retrieve")
    def test_handle_receipt_email_when_unsent(self, one_time_contribution: "Contribution", now: datetime.datetime):
        query = TransactionalEmailRecord.objects.filter(
            contribution=one_time_contribution,
            name=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
        )
        assert not query.exists()
        TransactionalEmailRecord.handle_receipt_email(one_time_contribution)
        assert query.exists()
        assert query.count() == 1
        record = query.first()
        assert record.sent_on == now

    @pytest.mark.usefixtures("_mock_stripe_retrieve")
    def test_handle_receipt_email_when_already_sent(
        self, transactional_email_record_receipt_email: TransactionalEmailRecord
    ):
        query = TransactionalEmailRecord.objects.filter(
            contribution=transactional_email_record_receipt_email.contribution,
            name=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
        )
        assert query.exists()
        TransactionalEmailRecord.handle_receipt_email(
            contribution=transactional_email_record_receipt_email.contribution
        )
        assert query.count() == 1

    def test_handle_receipt_email_when_organization_does_not_send_receipt_emails_via_nre(
        self, one_time_contribution: "Contribution"
    ):
        one_time_contribution.revenue_program.organization.send_receipt_email_via_nre = False
        one_time_contribution.revenue_program.organization.save()
        query = TransactionalEmailRecord.objects.filter(
            contribution=one_time_contribution,
            name=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
        )
        assert not query.exists()
        TransactionalEmailRecord.handle_receipt_email(one_time_contribution)
        assert not query.exists()

    def test_str(self, transactional_email_record_receipt_email: TransactionalEmailRecord):
        msg = transactional_email_record_receipt_email
        assert (
            str(transactional_email_record_receipt_email)
            == f"TransactionalEmailRecord #{msg.pk} ({msg.name}) for {msg.contribution.pk} sent {msg.sent_on}"
        )
