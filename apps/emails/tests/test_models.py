import typing

from django.utils import timezone

import pytest
import pytest_mock

from apps.emails.models import EmailCustomization, TransactionalEmailNames, TransactionalEmailRecord


if typing.TYPE_CHECKING:
    from apps.contributions.models import Contribution


@pytest.mark.django_db
class TestEmailCustomization:

    def test_save_removes_unexpected_html_tags(self, email_customization: EmailCustomization):
        email_customization.content_html = "<script>not allowed</script><strong>OK</strong>"
        email_customization.save()
        assert email_customization.content_html == "<strong>OK</strong>"

    def test_save_removes_unexpected_html_attributes(self, email_customization: EmailCustomization):
        email_customization.content_html = '<strong onclick="doEvil()">should be pruned</strong>'
        email_customization.save()
        assert email_customization.content_html == "<strong>should be pruned</strong>"

    def test_plain_text_conversion(self, email_customization: EmailCustomization):
        email_customization.content_html = """
          <p><strong>Bold</strong> <em>Italic</em> <s>Strike</s> <u>Underline</u></p>
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
        self, one_time_contribution: "Contribution", now: timezone.datetime
    ) -> TransactionalEmailRecord:
        """Fixture to create a default TransactionalEmailRecord instance."""
        record = TransactionalEmailRecord(
            contribution=one_time_contribution,
            name=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
            sent_on=now,
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
            name=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
        )
        assert not query.exists()
        TransactionalEmailRecord.handle_receipt_email(one_time_contribution)
        assert query.exists()
        assert query.count() == 1
        record = query.first()
        assert record.sent_on

    @pytest.mark.usefixtures("_mock_stripe_retrieve")
    def test_handle_receipt_email_when_already_sent(
        self, transactional_email_record_receipt_email: TransactionalEmailRecord, now: timezone.datetime
    ):
        query = TransactionalEmailRecord.objects.filter(
            contribution=transactional_email_record_receipt_email.contribution,
            name=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
            sent_on=now,
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
            name=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
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

    def test_handle_annual_payment_reminder_when_not_already_sent(
        self,
        annual_contribution: "Contribution",
        mocker: pytest_mock.MockerFixture,
        now: timezone.datetime,
    ):
        mock_send_mail = mocker.patch("apps.contributions.models.Contribution.send_recurring_contribution_change_email")
        uid = "unique-id-123"
        query = TransactionalEmailRecord.objects.filter(
            contribution=annual_contribution,
            name=TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
            unique_identifier=uid,
        )
        assert not query.exists()
        TransactionalEmailRecord.handle_annual_payment_reminder(
            contribution=annual_contribution,
            unique_identifier=uid,
            next_charge_date=now.date(),
        )
        assert query.exists()
        assert query.count() == 1
        mock_send_mail.assert_called_once_with(
            f"Reminder: {annual_contribution.revenue_program.name} scheduled contribution",
            "recurring-contribution-email-reminder",
            now.date(),
        )

    def test_handle_annual_payment_reminder_when_already_sent(
        self,
        annual_contribution: "Contribution",
        mocker: pytest_mock.MockerFixture,
        now: timezone.datetime,
    ):
        mock_send_mail = mocker.patch("apps.contributions.models.Contribution.send_recurring_contribution_change_email")
        uid = "unique-id-123"
        kwargs = {
            "contribution": annual_contribution,
            "unique_identifier": uid,
            "name": TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
        }
        TransactionalEmailRecord.objects.create(**kwargs)
        query = TransactionalEmailRecord.objects.filter(**kwargs)
        assert query.count() == 1
        TransactionalEmailRecord.handle_annual_payment_reminder(
            contribution=annual_contribution,
            unique_identifier=uid,
            next_charge_date=now.date(),
        )
        assert query.count() == 1
        mock_send_mail.assert_not_called()

    def test_handle_annual_payment_reminder_when_organization_does_not_send_reminders(
        self, annual_contribution: "Contribution", mocker: pytest_mock.MockerFixture
    ):
        mock_send_mail = mocker.patch("apps.contributions.models.Contribution.send_recurring_contribution_change_email")
        annual_contribution.revenue_program.organization.disable_reminder_emails = True
        annual_contribution.revenue_program.organization.save()
        uid = "unique-id-123"
        TransactionalEmailRecord.handle_annual_payment_reminder(
            contribution=annual_contribution,
            unique_identifier=uid,
            next_charge_date=timezone.now().date(),
        )
        assert not TransactionalEmailRecord.objects.filter(
            contribution=annual_contribution,
            name=TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
            unique_identifier=uid,
        ).exists()
        mock_send_mail.assert_not_called()

    @pytest.mark.parametrize("contribution_fixture", ["monthly_contribution", "one_time_contribution"])
    def test_handle_annual_payment_reminder_when_not_year_interval(
        self,
        mocker: pytest_mock.MockerFixture,
        now: timezone.datetime,
        contribution_fixture: str,
        request: pytest.FixtureRequest,
    ):
        mock_send_mail = mocker.patch("apps.contributions.models.Contribution.send_recurring_contribution_change_email")
        uid = "unique-id-123"
        contribution = request.getfixturevalue(contribution_fixture)
        TransactionalEmailRecord.handle_annual_payment_reminder(
            contribution=contribution,
            unique_identifier=uid,
            next_charge_date=now.date(),
        )
        assert not TransactionalEmailRecord.objects.filter(
            contribution=contribution,
            name=TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
            unique_identifier=uid,
        ).exists()
        mock_send_mail.assert_not_called()
