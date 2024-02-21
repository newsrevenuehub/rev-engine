import os
import time
from datetime import datetime, timedelta
from types import TracebackType
from typing import List

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

import requests
import stripe
from celery import Task, shared_task
from celery.utils.log import get_task_logger
from requests.exceptions import RequestException
from sentry_sdk import configure_scope
from stripe.error import RateLimitError

from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    StripeContributionsProvider,
    SubscriptionsCacheProvider,
)
from apps.contributions.stripe_sync import StripeToRevengineTransformer
from apps.contributions.types import StripeEventData
from apps.contributions.utils import export_contributions_to_csv
from apps.contributions.webhooks import StripeWebhookProcessor
from apps.emails.tasks import send_templated_email_with_attachment
from apps.organizations.models import RevenueProgram


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def ping_healthchecks(check_name, healthcheck_url):
    """Attempt to ping a healthchecks.io to enable monitoring of tasks"""
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
def auto_accept_flagged_contributions():
    logger.info('Starting task, "auto_accept_flagged_contributions"')
    successful_captures = 0
    failed_captures = 0
    now = timezone.now()
    eligible_flagged_contributions = Contribution.objects.filter(
        status=ContributionStatus.FLAGGED, flagged_date__lte=now - timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA)
    )
    logger.info("Found %s flagged contributions past auto-accept date", len(eligible_flagged_contributions))

    for contribution in eligible_flagged_contributions:
        payment_intent = contribution.get_payment_manager_instance()
        try:
            payment_intent.complete_payment(reject=False)
            successful_captures += 1
        except PaymentProviderError:
            failed_captures += 1

    logger.info("Successfully captured %s previously-held payments.", successful_captures)
    if failed_captures:
        logger.warning("Failed to capture %s previously-held payments. Check logs for ids.", failed_captures)

    ping_healthchecks("auto_accept_flagged_contributions", settings.HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS)
    return successful_captures, failed_captures


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_pull_serialized_stripe_contributions_to_cache(self, email_id, stripe_account_id):
    """Pull all payment intents for a given email associated with a stripe account."""
    logger.info(
        "[task_pull_serialized_stripe_contributions_to_cache] called with email_id (%s) and stripe_account_id (%s)",
        email_id,
        stripe_account_id,
    )
    with configure_scope() as scope:
        scope.user = {"email": email_id}
        provider = StripeContributionsProvider(email_id, stripe_account_id)
        # trigger async tasks to pull payment intents for a given set of customer queries, if there are two queries
        # the task will get triggered two times which are asynchronous
        for customer_query in provider.generate_chunked_customers_query():
            logger.info("Pulling payment intents for %s", customer_query)
            task_pull_payment_intents_and_uninvoiced_subs.delay(email_id, customer_query, stripe_account_id)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_pull_payment_intents_and_uninvoiced_subs(self, email_id, customers_query, stripe_account_id):
    """Pull all payment_intents and uninvoiced subscriptions from stripe for a given set of customers."""
    logger.info(
        "Pulling payment intents and uninvoiced subscriptions for email %s with query %s", email_id, customers_query
    )
    with configure_scope() as scope:
        scope.user = {"email": email_id}
        provider = StripeContributionsProvider(email_id, stripe_account_id)
        pi_cache_provider = ContributionsCacheProvider(
            email_id,
            stripe_account_id,
        )
        sub_cache_provider = SubscriptionsCacheProvider(
            email_id,
            stripe_account_id,
        )
        keep_going = True
        page = None
        # iterate through all pages of stripe payment intents
        logger.info("Pulling payment intents for email %s with query %s", email_id, customers_query)
        while keep_going:
            pi_search_response = provider.fetch_payment_intents(query=customers_query, page=page)
            pi_cache_provider.upsert(pi_search_response.data)
            subscriptions = [x.invoice.subscription for x in pi_search_response.data if x.invoice]
            sub_cache_provider.upsert(subscriptions)
            keep_going = pi_search_response.has_more
            page = pi_search_response.next_page
        logger.info("Pulling uninvoiced subscriptions for %s", email_id)
        uninvoiced_subs = provider.fetch_uninvoiced_subscriptions_for_contributor()
        sub_cache_provider.upsert(uninvoiced_subs)
        converted = pi_cache_provider.convert_uninvoiced_subs_into_contributions(uninvoiced_subs)
        pi_cache_provider.upsert_uninvoiced_subscriptions(converted)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def email_contribution_csv_export_to_user(
    self, contribution_ids: List[int], to_email: str, show_upgrade_prompt: bool
) -> None:
    """Email a CSV containing data about a set of contributions

    Note that this task is intentionally "dumb". It implicitly assumes that it is safe to send data about contribution ids
    to person at `to_email`. Permissions-related restrictions therefore need to be handled in the calling context.
    """
    contributions = Contribution.objects.filter(id__in=contribution_ids)
    if diff := set(contribution_ids).difference(set(contributions.values_list("id", flat=True))):
        logger.warning(
            (
                "`email_contribution_csv_export_to_user` was unable to locate %s of %s requested contributions. The following "
                "IDs could not be found: %s"
            ),
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
                    "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
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
    except stripe.error.StripeError as ex:
        logger.exception(
            "[task_verify_apple_domain] task failed for slug %s due to exception: %s", revenue_program_slug, ex.error
        )
        raise ex


@shared_task(bind=True)
def on_process_stripe_webhook_task_failure(self, task: Task, exc: Exception, traceback: TracebackType) -> None:
    """Ensure we get an error notification in Sentry if the task fails"""
    logger.error(f"process_stripe_webhook_task {task.id} failed. Error: {exc}")


@shared_task(
    bind=True,
    link_error=on_process_stripe_webhook_task_failure.s(),
)
def process_stripe_webhook_task(self, raw_event_data: dict) -> None:
    logger.info("Processing Stripe webhook event with ID %s", raw_event_data["id"])

    processor = StripeWebhookProcessor(event=(event := StripeEventData(**raw_event_data)))
    try:
        processor.process()
    except Contribution.DoesNotExist:
        # there's an entire class of customer subscriptions for which we do not expect to have a Contribution object.
        # Specifically, we expect this to be the case for import legacy recurring contributions, which may have a future
        # first/next(in NRE platform) payment date.
        # TODO: [DEV-4151] Add some sort of analytics / telemetry to track how often this happens
        logger.info("Could not find contribution. Here's the event data: %s", event, exc_info=True)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_backfill_contributions_and_payments(
    from_date: str, to_date: str, for_orgs: list[str] = None, for_stripe_accounts: list[str] = None
):
    logger.info(
        "Running `task_backfill_contributions_and_payments` with params: from_date=%s, to_date=%s, for_orgs=%s, for_stripe_accounts=%s",
        from_date,
        to_date,
        for_orgs,
        for_stripe_accounts,
    )

    from_date = datetime.fromtimestamp(int(from_date)) if from_date else None
    to_date = datetime.fromtimestamp(int(to_date)) if to_date else None

    StripeToRevengineTransformer(
        from_date=from_date, to_date=to_date, for_stripe_accounts=for_stripe_accounts, for_orgs=for_orgs
    ).backfill_contributions_and_payments_from_stripe()
    logger.info("`task_backfill_contributions_and_payments` is done")
