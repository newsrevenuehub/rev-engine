import datetime
import os
from csv import DictReader
from datetime import timedelta

from django.conf import settings
from django.template.loader import render_to_string

import pytest
import stripe.error
from requests.exceptions import RequestException

from apps.contributions import tasks as contribution_tasks
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    StripeContributionsProvider,
    StripePiSearchResponse,
    SubscriptionsCacheProvider,
)
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.utils import CONTRIBUTION_EXPORT_CSV_HEADERS


@pytest.fixture
def expiring_flagged_contributions(now):
    flagged_date = now - timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA) - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.fixture
def non_expiring_flagged_contributions(now):
    flagged_date = now - timedelta(days=1)
    return ContributionFactory.create_batch(2, status=ContributionStatus.FLAGGED, flagged_date=flagged_date)


@pytest.mark.django_db
class AutoAcceptFlaggedContributionsTaskTest:
    def test_successful_captures(self, non_expiring_flagged_contributions, expiring_flagged_contributions, mocker):
        expected_update_count = len(expiring_flagged_contributions)
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.assert_called_n_times(expected_update_count)
        assert succeeded == expected_update_count
        assert failed == 0

    def test_unsuccessful_captures(self, mocker, expiring_flagged_contributions, non_expiring_flagged_contributions):
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.side_effect = PaymentProviderError
        mock_complete_payment.assert_called_n_times(expected_len := len(expiring_flagged_contributions))
        assert failed == expected_len
        assert succeeded == 0

    def test_only_acts_on_flagged(self, mocker, non_expiring_flagged_contributions):
        mock_complete_payment = mocker.patch(
            "apps.contributions.payment_managers.StripePaymentManager.complete_payment"
        )
        succeeded, failed = contribution_tasks.auto_accept_flagged_contributions()
        mock_complete_payment.assert_not_called()
        assert succeeded == 0
        assert failed == 0


class TestTaskPullSerializedStripeContributionsToCache:
    def test_happy_path(self, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.generate_chunked_customers_query",
            return_value=(
                queries := [
                    "customer:'cust_0' OR customer:'cust_1'",
                    "customer:'cust_2' OR customer:'cust_3'",
                    "customer:'cust_4' OR customer:'cust_5'",
                ]
            ),
        )
        mock_pull_pis = mocker.patch("apps.contributions.tasks.task_pull_payment_intents_and_uninvoiced_subs.delay")
        contribution_tasks.task_pull_serialized_stripe_contributions_to_cache("test@email.com", "acc_00000")
        assert mock_pull_pis.call_count == len(queries)


NEXT_PAGE = "some-page-identifier"


@pytest.fixture
def stripe_pi_search_result_factory(pi_for_active_subscription_factory, pi_for_valid_one_time_factory):
    class Factory:
        def get(self, rp_slug: str, has_more: bool, num_with_subs: int, num_without_subs: int):
            one_time_pis = [pi_for_valid_one_time_factory.get() for _ in range(num_without_subs)]
            subscription_pis = [pi_for_active_subscription_factory.get(rp_slug) for _ in range(num_with_subs)]
            for pi in one_time_pis + subscription_pis:
                pi["metadata"]["revenue_program_slug"] = rp_slug

            return StripePiSearchResponse(
                url="something",
                has_more=has_more,
                data=one_time_pis + subscription_pis,
                next_page=NEXT_PAGE if has_more else None,
            )

    return Factory()


@pytest.fixture
def stripe_uninvoiced_subscription_factory(subscription_data_factory):
    class Factory:
        def get(self, rp_slug: str, *args, **kwargs) -> stripe.Subscription:
            anchor = (now := datetime.datetime.now(tz=datetime.timezone.utc)) + datetime.timedelta(days=365)
            data = subscription_data_factory.get()
            data = data | {
                "created": now.timestamp(),
                "latest_invoice": None,
                "billing_cycle_anchor": anchor.timestamp(),
                "interval": "year",
                "status": "active",
                "metadata": data["metadata"] | {"revenue_program_slug": rp_slug},
            }
            return stripe.Subscription.construct_from(data | kwargs, stripe.api_key)

    return Factory()


@pytest.mark.django_db
class TestTaskPullPaymentIntentsAndUninvoicedSubs:
    def test_happy_path(
        self, revenue_program, mocker, stripe_pi_search_result_factory, stripe_uninvoiced_subscription_factory
    ):
        contributions_cache_init_spy = mocker.spy(ContributionsCacheProvider, "__init__")
        subscriptions_cache_init_spy = mocker.spy(SubscriptionsCacheProvider, "__init__")
        contributions_provider_cast_sub_to_pi_spy = mocker.spy(
            StripeContributionsProvider, "cast_subscription_to_pi_for_portal"
        )

        mock_contributions_cache_upsert = mocker.patch(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.upsert"
        )
        mock_subscriptions_cache_upsert = mocker.patch(
            "apps.contributions.stripe_contributions_provider.SubscriptionsCacheProvider.upsert"
        )
        mock_fetch_pis = mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.fetch_payment_intents",
            side_effect=[
                (
                    pi_search1 := stripe_pi_search_result_factory.get(
                        has_more=True, num_with_subs=2, num_without_subs=2, rp_slug=revenue_program.slug
                    )
                ),
                (
                    pi_search2 := stripe_pi_search_result_factory.get(
                        has_more=False, num_with_subs=2, num_without_subs=2, rp_slug=revenue_program.slug
                    )
                ),
            ],
        )
        mock_fetch_uninvoiced_subs = mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeContributionsProvider.fetch_uninvoiced_subscriptions_for_contributor",
            return_value=[stripe_uninvoiced_subscription_factory.get(revenue_program.slug) for _ in range(2)],
        )
        mock_upsert_uninvoiced_subs = mocker.patch(
            "apps.contributions.stripe_contributions_provider.ContributionsCacheProvider.upsert_uninvoiced_subscriptions"
        )
        contribution_tasks.task_pull_payment_intents_and_uninvoiced_subs(
            email_id=(email := "test@test.com"),
            customers_query=(query := "some-query"),
            stripe_account_id=(stripe_account := "acc_0000"),
        )
        contributions_cache_init_spy.assert_called_once_with(
            mocker.ANY,
            email,
            stripe_account,
        )
        subscriptions_cache_init_spy.assert_called_once_with(mocker.ANY, email, stripe_account)
        # the first pi search result has `has_more=True` so we expect two calls in next two lines
        assert mock_fetch_pis.call_count == 2
        assert mock_fetch_pis.has_calls(
            [
                mocker.call(query=query, page=None),
                mocker.call(query=query, page=NEXT_PAGE),
            ]
        )
        assert mock_contributions_cache_upsert.call_count == 2
        assert mock_contributions_cache_upsert.has_calls([mocker.call(pi_search1.data), mocker.call(pi_search2.data)])
        mock_fetch_uninvoiced_subs.assert_called_once()
        # twice when retrieving pis, once when retrieving uninvoiced subs
        assert mock_subscriptions_cache_upsert.call_count == 3
        assert contributions_provider_cast_sub_to_pi_spy.call_count == 2
        assert contributions_provider_cast_sub_to_pi_spy.call_count == 2
        assert mock_upsert_uninvoiced_subs.call_count == 1


@pytest.mark.django_db
class TestEmailContributionCsvExportToUser:
    def test_when_all_requested_contributions_found(self, monkeypatch, mocker, org_user_free_plan):
        """Show happy path behavior when all of requested contributions are found and included in export

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
                    "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
                    "show_upgrade_prompt": show_upgrade_prompt,
                },
            ),
            message_as_html=render_to_string("nrh-contribution-csv-email-body.html", context),
            attachment=mocker.ANY,
            content_type="text/csv",
            filename="contributions.csv",
        )
        data = [row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]
        assert set(data[0].keys()) == set(CONTRIBUTION_EXPORT_CSV_HEADERS)
        assert set([str(_.pk) for _ in contributions]) == set([_["Contribution ID"] for _ in data])

    def test_when_some_requested_contributions_missing(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when some requested contributions are not found

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
                        "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
                        "show_upgrade_prompt": True,
                    }
                ),
            ),
            message_as_html=render_to_string("nrh-contribution-csv-email-body.html", context),
            attachment=mocker.ANY,
            content_type="text/csv",
            filename="contributions.csv",
        )
        data = [row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]
        assert set(str(x) for x in ids).difference(set([_["Contribution ID"] for _ in data])) == {str(deleted_id)}
        logger_spy.assert_called_once_with(
            (
                "`email_contribution_csv_export_to_user` was unable to locate %s of %s requested contributions. The following "
                "IDs could not be found: %s"
            ),
            1,
            len(ids),
            str(deleted_id),
        )

    def test_when_contribution_ids_is_empty_list(self, org_user_free_plan, monkeypatch, mocker):
        """Show behavior when task called with empty list for contributions ids

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
        assert set(make_csv_spy.call_args[0][0]) == set(Contribution.objects.none())
        assert send_email_spy.call_args[1]["to"] == org_user_free_plan.email
        assert send_email_spy.call_args[1]["subject"] == "Check out your Contributions"
        assert send_email_spy.call_args[1]["message_as_text"] == render_to_string(
            "nrh-contribution-csv-email-body.txt",
            (
                context := {
                    "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
                    "show_upgrade_prompt": True,
                }
            ),
        )
        assert send_email_spy.call_args[1]["message_as_html"] == render_to_string(
            "nrh-contribution-csv-email-body.html", context
        )
        assert len([row for row in DictReader(send_email_spy.call_args[1]["attachment"].splitlines())]) == 0


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
    """This a minimal and admittedly suboptimal test class for our process_stripe_webhook_task

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
        """Test that our task is configured properly -- especially that its link_error parameter is set as expected"""
        assert (
            contribution_tasks.process_stripe_webhook_task.link_error.task
            == "apps.contributions.tasks.on_process_stripe_webhook_task_failure"
        )

    @pytest.mark.parametrize("contribution_found", (True, False))
    def test_synchronously(self, contribution_found, payment_intent_succeeded, mocker):
        mock_process = mocker.patch("apps.contributions.webhooks.StripeWebhookProcessor.process")
        mock_logger = mocker.patch("apps.contributions.tasks.logger.debug")
        if not contribution_found:
            mock_process.side_effect = Contribution.DoesNotExist
        contribution_tasks.process_stripe_webhook_task(raw_event_data=payment_intent_succeeded)
        mock_process.assert_called_once()
        if contribution_found:
            mock_logger.assert_not_called()
        else:
            mock_logger.assert_called_once_with("Could not find contribution", exc_info=True)


def test_on_process_stripe_webhook_task_failure(mocker):
    mock_logger = mocker.patch("apps.contributions.tasks.logger.error")
    task = mocker.Mock(id=(my_id := "some-task-id"))
    exc = Exception("foo")
    tb = mocker.Mock()
    contribution_tasks.on_process_stripe_webhook_task_failure(task, exc, tb)
    mock_logger.assert_called_once_with(f"process_stripe_webhook_task {my_id} failed. Error: {exc}")
