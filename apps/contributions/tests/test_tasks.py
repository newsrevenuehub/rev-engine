from csv import DictReader
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

import pytest
import pytest_mock
import stripe.error
from pytest_django.fixtures import SettingsWrapper
from requests.exceptions import RequestException

from apps.contributions import tasks as contribution_tasks
from apps.contributions.choices import QuarantineStatus
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.typings import StripeEventData
from apps.contributions.utils import CONTRIBUTION_EXPORT_CSV_HEADERS
from apps.contributions.webhooks import StripeWebhookProcessor


@pytest.fixture
def expiring_flagged_contributions(now):
    flagged_date = now - timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA) - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.fixture
def non_expiring_flagged_contributions(now):
    flagged_date = now - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.mark.django_db
class TestEmailContributionCsvExportToUser:
    def test_when_all_requested_contributions_found(self, monkeypatch, mocker, org_user_free_plan):
        """Show happy path behavior when all of requested contributions are found and included in export.

        Note that we rely on narrow unit testing of export_contributions_to_csv elsewhere. We only assert that
        expected rows show up based on value for contribution id, but we don't test any other attributes at row
        level in this test.
        """
        contributions = ContributionFactory.create_batch(size=10)
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        contribution_tasks.email_contribution_csv_export_to_user(
            [x.id for x in contributions], org_user_free_plan.email, (show_upgrade_prompt := True)
        )
        make_csv_spy.assert_called_once()
        assert set(make_csv_spy.call_args[0][0]) == set(
            Contribution.objects.filter(id__in=[x.id for x in contributions])
        )
        send_email_spy.assert_called_once_with(
            to=org_user_free_plan.email,
            subject="Check out your Contributions",
            message_as_text=render_to_string(
                "nrh-contribution-csv-email-body.txt",
                context := {
                    "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
                    "show_upgrade_prompt": show_upgrade_prompt,
                },
            ),
            message_as_html=render_to_string("nrh-contribution-csv-email-body.html", context),
            attachment=mocker.ANY,
            content_type="text/csv",
            filename="contributions.csv",
        )
        data = list(DictReader(send_email_spy.call_args[1]["attachment"].splitlines()))
        assert set(data[0].keys()) == set(CONTRIBUTION_EXPORT_CSV_HEADERS)
        assert {str(_.pk) for _ in contributions} == {_["Contribution ID"] for _ in data}

    def test_when_some_requested_contributions_missing(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when some requested contributions are not found.

        In this case, the task should still succeed, generating a CSV with a subset of the requested contributions.

        Additionally, it will log a warning.
        """
        contributions = ContributionFactory.create_batch(size=10)
        ids = [x.id for x in contributions]
        deleted = contributions.pop(0)
        deleted_id = deleted.id
        deleted.delete()
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        logger_spy = mocker.spy(contribution_tasks.logger, "warning")
        contribution_tasks.email_contribution_csv_export_to_user(ids, org_user_free_plan.email, True)
        make_csv_spy.assert_called_once()
        send_email_spy.assert_called_once_with(
            to=org_user_free_plan.email,
            subject="Check out your Contributions",
            message_as_text=render_to_string(
                "nrh-contribution-csv-email-body.txt",
                (
                    context := {
                        "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
                        "show_upgrade_prompt": True,
                    }
                ),
            ),
            message_as_html=render_to_string("nrh-contribution-csv-email-body.html", context),
            attachment=mocker.ANY,
            content_type="text/csv",
            filename="contributions.csv",
        )
        data = list(DictReader(send_email_spy.call_args[1]["attachment"].splitlines()))
        assert {str(x) for x in ids}.difference({x["Contribution ID"] for x in data}) == {str(deleted_id)}
        logger_spy.assert_called_once_with(
            "`email_contribution_csv_export_to_user` was unable to locate %s of %s requested contributions. The following"
            " IDs could not be found: %s",
            1,
            len(ids),
            str(deleted_id),
        )

    def test_when_contribution_ids_is_empty_list(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when task called with empty list for contributions ids.

        In this case, a CSV with only headers will be sent.
        """
        ids = []
        monkeypatch.setattr(
            "apps.contributions.tasks.send_templated_email_with_attachment", lambda *args, **kwargs: None
        )
        send_email_spy = mocker.spy(contribution_tasks, "send_templated_email_with_attachment")
        make_csv_spy = mocker.spy(contribution_tasks, "export_contributions_to_csv")
        contribution_tasks.email_contribution_csv_export_to_user(ids, org_user_free_plan.email, True)
        send_email_spy.assert_called_once()
        make_csv_spy.assert_called_once()
        context = {
            "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
            "show_upgrade_prompt": True,
        }
        assert set(make_csv_spy.call_args[0][0]) == set(Contribution.objects.none())
        assert send_email_spy.call_args[1]["to"] == org_user_free_plan.email
        assert send_email_spy.call_args[1]["subject"] == "Check out your Contributions"
        assert send_email_spy.call_args[1]["message_as_text"] == render_to_string(
            "nrh-contribution-csv-email-body.txt", context
        )
        assert send_email_spy.call_args[1]["message_as_html"] == render_to_string(
            "nrh-contribution-csv-email-body.html", context
        )
        assert len(list(DictReader(send_email_spy.call_args[1]["attachment"].splitlines()))) == 0


class TestTaskverifyAppleDomain:
    def test_happy_path(self, mocker):
        mock_get_rp = mocker.patch(
            "apps.contributions.tasks.RevenueProgram.objects.get", return_value=(rp := mocker.MagicMock())
        )
        contribution_tasks.task_verify_apple_domain(revenue_program_slug=(slug := "slug"))
        rp.stripe_create_apple_pay_domain.assert_called_once()
        mock_get_rp.assert_called_once_with(slug=slug)

    def test_task_verify_apple_domain_when_stripe_error(self, mocker):
        mock_get_rp = mocker.patch(
            "apps.organizations.models.RevenueProgram.objects.get", return_value=(rp := mocker.MagicMock())
        )
        rp.stripe_create_apple_pay_domain.side_effect = stripe.error.StripeError("Uh oh")
        with pytest.raises(stripe.error.StripeError):
            contribution_tasks.task_verify_apple_domain(revenue_program_slug=(slug := "slug"))
        rp.stripe_create_apple_pay_domain.assert_called_once()
        mock_get_rp.assert_called_with(slug=slug)


class TestPingHealthChecks:
    def test_when_healthchecks_url_not_truthy(self, mocker):
        logger_spy = mocker.spy(contribution_tasks.logger, "warning")
        mock_requests_get = mocker.patch("requests.get")
        contribution_tasks.ping_healthchecks(check_name=(check_name := "foo"), healthcheck_url=None)
        mock_requests_get.assert_not_called()
        logger_spy.assert_called_once_with("URL for %s not available in this environment", check_name)

    def test_happy_path(self, mocker):
        mock_requests_get = mocker.patch("requests.get")
        contribution_tasks.ping_healthchecks(check_name="foo", healthcheck_url=(url := "https://foo"))
        mock_requests_get.assert_called_once_with(url, timeout=1)

    def test_when_request_exception(self, mocker):
        logger_spy = mocker.spy(contribution_tasks.logger, "warning")
        mocker.patch("requests.get", side_effect=RequestException("Uh oh"))
        contribution_tasks.ping_healthchecks(check_name=(check_name := "foo"), healthcheck_url="https://foo")
        for i, x in enumerate(logger_spy.call_args_list):
            assert x == mocker.call("Request %s for %s healthcheck failed", i + 1, check_name)


class TestProcessStripeWebhookTask:
    """Minimal and admittedly suboptimal test class for our process_stripe_webhook_task.

    The critical thing we'd like to test about this task is that when the task fails, the
    on_process_stripe_webhook_task_failure gets called (which gives us a notification in Sentry).

    Ideally, we'd do that in such a way as to "naturally" (i.e., without mocking) the callback to
    get called with signature it will get called with in real life. In practice, BW could not get this working
    as expected using pytest celery_app and celery_worker (though with further effort, that may be possible)

    In short term, we have an implementation-focused test that shows that our task is configured with
    expected link_error callback (and in turn, we unit test that function).

    TODO: [DEV-4173] Run redis in test environment and refactor TestProcessStripeWebhookTask to be a true integration test.
    """

    def test_config(self):
        """Test that our task is configured properly -- especially that its link_error parameter is set as expected."""
        assert (
            contribution_tasks.process_stripe_webhook_task.link_error.task
            == "apps.contributions.tasks.on_process_stripe_webhook_task_failure"
        )

    @pytest.mark.parametrize("contribution_found", [True, False])
    def test_synchronously(self, contribution_found, payment_intent_payment_failed, mocker):
        mock_process = mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.process")
        mock_logger = mocker.patch("apps.contributions.tasks.logger.info")
        if not contribution_found:
            mock_process.side_effect = Contribution.DoesNotExist
        contribution_tasks.process_stripe_webhook_task(raw_event_data=payment_intent_payment_failed)
        mock_process.assert_called_once()
        if contribution_found:
            assert mock_logger.call_count == 1
            assert mock_logger.call_args == mocker.call("Processing Stripe webhook event with ID %s", mocker.ANY)
        else:
            assert mock_logger.call_args == mocker.call(
                "Could not find contribution. Here's the event data: %s", mocker.ANY, exc_info=True
            )

    def test_event_properties_passed_to_processor(self, payment_intent_payment_failed, mocker):
        mock_processor = mocker.patch.object(StripeWebhookProcessor, "__new__")
        contribution_tasks.process_stripe_webhook_task(raw_event_data=payment_intent_payment_failed)
        mock_processor.assert_called_once_with(
            mocker.ANY,
            event=StripeEventData(
                id=payment_intent_payment_failed.get("id"),
                object=payment_intent_payment_failed.get("object"),
                account=payment_intent_payment_failed.get("account"),
                api_version=payment_intent_payment_failed.get("api_version"),
                created=payment_intent_payment_failed.get("created"),
                data=payment_intent_payment_failed.get("data"),
                request=payment_intent_payment_failed.get("request"),
                livemode=payment_intent_payment_failed.get("livemode"),
                pending_webhooks=payment_intent_payment_failed.get("pending_webhooks"),
                type=payment_intent_payment_failed.get("type"),
            ),
        )

    def test_extraneous_properties_on_event(self, payment_intent_payment_failed, mocker):
        mock_processor = mocker.Mock()
        mocker.patch.object(StripeWebhookProcessor, "__new__", return_value=mock_processor)
        payment_intent_payment_failed["unexpected_property"] = "value"
        contribution_tasks.process_stripe_webhook_task(raw_event_data=payment_intent_payment_failed)
        mock_processor.process.assert_called_once()

    def test_calls_healthchecks(
        self,
        mocker: pytest_mock.MockerFixture,
        payment_intent_payment_failed: dict[str, Any],
        settings: SettingsWrapper,
    ):
        settings.HEALTHCHECK_URL_PROCESS_STRIPE_WEBHOOK_TASK = "https://foo"
        mocker.patch.object(StripeWebhookProcessor, "__new__")
        mock_ping_healthchecks = mocker.patch("apps.contributions.tasks.ping_healthchecks")
        contribution_tasks.process_stripe_webhook_task(payment_intent_payment_failed)
        mock_ping_healthchecks.assert_called_once_with(
            "process_stripe_webhook_task", settings.HEALTHCHECK_URL_PROCESS_STRIPE_WEBHOOK_TASK
        )


def test_on_process_stripe_webhook_task_failure(mocker):
    mock_logger = mocker.patch("apps.contributions.tasks.logger.error")
    task = mocker.Mock(id=(my_id := "some-task-id"))
    exc = Exception("foo")
    tb = mocker.Mock()
    contribution_tasks.on_process_stripe_webhook_task_failure(task, exc, tb)
    mock_logger.assert_called_once_with("process_stripe_webhook_task %s failed. Error: %s", my_id, exc)


@pytest.mark.django_db
def test_process_stripe_webhook_task_when_contribution_not_exist_error(payment_intent_payment_failed, mocker):
    logger_spy = mocker.spy(contribution_tasks.logger, "info")
    Contribution.objects.all().delete()
    contribution_tasks.process_stripe_webhook_task(raw_event_data=payment_intent_payment_failed)
    assert logger_spy.call_args == mocker.call(
        "Could not find contribution. Here's the event data: %s",
        StripeEventData(**payment_intent_payment_failed),
        exc_info=True,
    )


@pytest.mark.django_db
def test_task_import_contributions_and_payments_for_stripe_account(mocker):
    mocker.patch("apps.contributions.stripe_import.StripeTransactionsImporter.import_contributions_and_payments")
    contribution_tasks.task_import_contributions_and_payments_for_stripe_account(
        from_date="",
        to_date="",
        stripe_account_id="",
        retrieve_payment_method=False,
        sentry_profiler=False,
        include_one_times=True,
        include_recurring=True,
        subscription_status="all",
    )


@pytest.mark.django_db
@pytest.mark.parametrize("abandoned_exists", [True, False])
@pytest.mark.usefixtures("not_unmarked_abandoned_contributions")
def test_mark_abandoned_carts_as_abandoned(abandoned_exists, unmarked_abandoned_contributions):
    assert Contribution.objects.unmarked_abandoned_carts().exists()
    prior_marked_abandoned = Contribution.objects.filter(status=ContributionStatus.ABANDONED).count()
    if not abandoned_exists:
        Contribution.objects.all().delete()
    contribution_tasks.mark_abandoned_carts_as_abandoned()
    if abandoned_exists:
        assert not Contribution.objects.unmarked_abandoned_carts().exists()
        assert Contribution.objects.filter(status=ContributionStatus.ABANDONED).count() == prior_marked_abandoned + len(
            unmarked_abandoned_contributions
        )
        for contribution in unmarked_abandoned_contributions:
            contribution.refresh_from_db()
            assert contribution.status == ContributionStatus.ABANDONED


@pytest.mark.django_db
class Test_auto_accept_flagged_contributions:

    @pytest.fixture
    def eligible_contributions(self, now: timezone.datetime) -> list[Contribution]:
        return ContributionFactory.create_batch(
            size=2,
            quarantine_status=QuarantineStatus.FLAGGED_BY_BAD_ACTOR,
            flagged_date=now - timedelta(days=settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA),
        )

    def test_happy_path(self, mocker: pytest_mock.MockerFixture, eligible_contributions: list[Contribution]) -> None:
        mock_ping_healthchecks = mocker.patch("apps.contributions.tasks.ping_healthchecks")
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        success_count, fail_count = contribution_tasks.auto_accept_flagged_contributions()
        mock_ping_healthchecks.assert_called_once()
        assert mock_complete_payment.call_count == len(eligible_contributions)
        assert success_count == len(eligible_contributions)
        assert fail_count == 0

    def test_when_payment_provider_error(
        self, mocker: pytest_mock.MockerFixture, eligible_contributions: list[Contribution]
    ) -> None:
        mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment",
            side_effect=[None, PaymentProviderError("Uh oh")],
        )
        success_count, fail_count = contribution_tasks.auto_accept_flagged_contributions()
        assert success_count == 1
        assert fail_count == 1
