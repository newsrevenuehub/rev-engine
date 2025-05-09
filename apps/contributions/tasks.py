import time
from datetime import datetime, timedelta
from types import TracebackType

from django.conf import settings
from django.db.utils import OperationalError
from django.template.loader import render_to_string
from django.utils import timezone

import requests
import reversion
import stripe
from celery import Task, shared_task
from celery.utils.log import get_task_logger
from requests.exceptions import RequestException
from stripe.error import APIConnectionError, RateLimitError

from apps.contributions.choices import QuarantineStatus
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.stripe_import import StripeTransactionsImporter
from apps.contributions.typings import StripeEventData
from apps.contributions.utils import export_contributions_to_csv
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.tasks import send_templated_email_with_attachment
from apps.organizations.models import RevenueProgram


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def ping_healthchecks(check_name, healthcheck_url):
    """Attempt to ping a healthchecks.io to enable monitoring of tasks."""
    if not healthcheck_url:
        logger.warning("URL for %s not available in this environment", check_name)
        return
    for attempt in range(1, 4):
        try:
            requests.get(healthcheck_url, timeout=1)
            break
        except RequestException:
            logger.warning("Request %s for %s healthcheck failed", attempt, check_name)
        time.sleep(1)


@shared_task
def mark_abandoned_carts_as_abandoned():
    logger.info("Starting task, 'mark_abandoned_carts_as_abandoned'")
    abandoned = Contribution.objects.unmarked_abandoned_carts()
    logger.info("Found %s abandoned carts", abandoned.count())
    updated = 0
    for contribution in abandoned:
        logger.info("Marking contribution %s as abandoned", contribution.id)
        with reversion.create_revision():
            contribution.status = ContributionStatus.ABANDONED
            contribution.save(update_fields={"status", "modified"})
            reversion.set_comment("`mark_abandoned_carts_as_abandoned` task marked as abandoned")
            updated += 1
    ping_healthchecks("mark_abandoned_carts_as_abandoned", settings.HEALTHCHECK_URL_MARK_ABANDONED_CARTS)
    logger.info("Marked %s contributions carts as abandoned", updated)


@shared_task
def auto_accept_flagged_contributions():
    logger.info('Starting task, "auto_accept_flagged_contributions"')
    successful_captures = 0
    failed_captures = 0
    now = timezone.now()
    eligible_flagged_contributions = Contribution.objects.filter(
        status=QuarantineStatus.FLAGGED_BY_BAD_ACTOR,
        flagged_date__lte=now - timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA),
    )
    logger.info(
        "Found %s flagged contributions past auto-accept date that are eligible for auto-accept",
        len(eligible_flagged_contributions),
    )

    for contribution in eligible_flagged_contributions:
        manager = contribution.get_payment_manager_instance()
        try:
            manager.complete_payment(
                new_quarantine_status=QuarantineStatus.APPROVED_BY_MACHINE_AFTER_WAIT, reject=False
            )
            successful_captures += 1
        except PaymentProviderError:
            failed_captures += 1

    logger.info("Successfully captured %s previously-held payments.", successful_captures)
    if failed_captures:
        logger.info("Failed to capture %s previously-held payments. Check logs for ids.", failed_captures)

    ping_healthchecks("auto_accept_flagged_contributions", settings.HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS)
    return successful_captures, failed_captures


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def email_contribution_csv_export_to_user(
    self, contribution_ids: list[int], to_email: str, show_upgrade_prompt: bool
) -> None:
    """Email a CSV containing data about a set of contributions.

    Note that this task is intentionally "dumb". It implicitly assumes that it is safe to send data about contribution ids
    to person at `to_email`. Permissions-related restrictions therefore need to be handled in the calling context.
    """
    contributions = Contribution.objects.filter(id__in=contribution_ids)
    if diff := set(contribution_ids).difference(set(contributions.values_list("id", flat=True))):
        logger.warning(
            "`email_contribution_csv_export_to_user` was unable to locate %s of %s requested contributions. The following"
            " IDs could not be found: %s",
            len(diff),
            len(contribution_ids),
            ", ".join(str(x) for x in diff),
        )
    send_templated_email_with_attachment(
        to=to_email,
        subject="Check out your Contributions",
        message_as_text=render_to_string(
            "nrh-contribution-csv-email-body.txt",
            (
                context := {
                    "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
                    "show_upgrade_prompt": show_upgrade_prompt,
                }
            ),
        ),
        message_as_html=render_to_string("nrh-contribution-csv-email-body.html", context),
        attachment=export_contributions_to_csv(contributions),
        content_type="text/csv",
        filename="contributions.csv",
    )


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_verify_apple_domain(self, revenue_program_slug: str):
    logger.info("[task_verify_apple_domain] called with revenue_program_slug %s.", revenue_program_slug)
    revenue_program = RevenueProgram.objects.get(slug=revenue_program_slug)
    try:
        revenue_program.stripe_create_apple_pay_domain()
        logger.info(
            "[task_verify_apple_domain] Apple Pay domain verified for revenue program %s with slug %s",
            revenue_program,
            revenue_program_slug,
        )
    except stripe.error.StripeError as exc:
        logger.exception(
            "[task_verify_apple_domain] task failed for slug %s due to exception: %s", revenue_program_slug, exc.error
        )
        raise


@shared_task(bind=True)
def on_process_stripe_webhook_task_failure(self, task: Task, exc: Exception, traceback: TracebackType) -> None:
    """Ensure we get an error notification in Sentry if the task fails."""
    logger.error("process_stripe_webhook_task %s failed. Error: %s", task.id, exc)


@shared_task(
    bind=True,
    autoretry_for=(APIConnectionError, OperationalError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    link_error=on_process_stripe_webhook_task_failure.s(),
)
def process_stripe_webhook_task(self, raw_event_data: dict) -> None:
    logger.info("Processing Stripe webhook event with ID %s", raw_event_data["id"])
    processor = StripeWebhookProcessor(
        event=(
            event := StripeEventData(
                id=raw_event_data.get("id"),
                object=raw_event_data.get("object"),
                account=raw_event_data.get("account"),
                api_version=raw_event_data.get("api_version"),
                created=raw_event_data.get("created"),
                data=raw_event_data.get("data"),
                request=raw_event_data.get("request"),
                livemode=raw_event_data.get("livemode"),
                pending_webhooks=raw_event_data.get("pending_webhooks"),
                type=raw_event_data.get("type"),
            )
        )
    )
    try:
        processor.process()
    except Contribution.DoesNotExist:
        # there's an entire class of customer subscriptions for which we do not expect to have a Contribution object.
        # Specifically, we expect this to be the case for import legacy recurring contributions, which may have a future
        # first/next(in NRE platform) payment date.
        # TODO @BW: Add some sort of analytics / telemetry to track how often this happens
        # DEV-4151
        logger.info("Could not find contribution. Here's the event data: %s", event, exc_info=True)
    ping_healthchecks("process_stripe_webhook_task", settings.HEALTHCHECK_URL_PROCESS_STRIPE_WEBHOOK_TASK)


@shared_task(bind=True)
def task_import_contributions_and_payments_for_stripe_account(
    self,
    from_date: str,
    to_date: str,
    stripe_account_id: str,
    retrieve_payment_method: bool,
    sentry_profiler: bool,
    include_one_times: bool,
    include_recurring: bool,
    subscription_status: str,
):
    """Task for syncing Stripe payment data to revengine."""
    logger.info(
        "Running `task_import_contributions_and_payments_for_stripe_account` with params: from_date=%s, to_date=%s, stripe_account=%s",
        from_date,
        to_date,
        stripe_account_id,
    )
    from_date = datetime.fromtimestamp(int(from_date), tz=datetime.timezone.utc) if from_date else None
    to_date = datetime.fromtimestamp(int(to_date), tz=datetime.timezone.utc) if to_date else None
    StripeTransactionsImporter(
        from_date=from_date,
        to_date=to_date,
        stripe_account_id=stripe_account_id,
        retrieve_payment_method=retrieve_payment_method,
        sentry_profiler=sentry_profiler,
        include_one_time_contributions=include_one_times,
        include_recurring_contributions=include_recurring,
        subscription_status=subscription_status,
    ).import_contributions_and_payments()
    logger.info("`task_import_contributions_and_payments` is done")
