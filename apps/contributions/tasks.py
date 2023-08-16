import os
import time
from datetime import timedelta
from typing import List

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

import requests
import stripe
from celery import shared_task
from celery.utils.log import get_task_logger
from requests.exceptions import RequestException
from sentry_sdk import configure_scope
from stripe.error import RateLimitError

from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.serializers import (
    PaymentProviderContributionSerializer,
    SubscriptionsSerializer,
)
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    StripeContributionsProvider,
    StripePaymentIntent,
    SubscriptionsCacheProvider,
)
from apps.contributions.utils import export_contributions_to_csv
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
            task_pull_payment_intents.delay(email_id, customer_query, stripe_account_id)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_pull_payment_intents(self, email_id, customers_query, stripe_account_id):
    """Pull all payment_intents from stripe for a given set of customers."""
    with configure_scope() as scope:
        scope.user = {"email": email_id}
        provider = StripeContributionsProvider(email_id, stripe_account_id)
        pi_cache_provider = ContributionsCacheProvider(
            email_id,
            stripe_account_id,
            serializer=PaymentProviderContributionSerializer,
            converter=StripePaymentIntent,
        )
        sub_cache_provider = SubscriptionsCacheProvider(
            email_id,
            stripe_account_id,
            serializer=SubscriptionsSerializer,
        )
        pi_response = provider.fetch_payment_intents(query=customers_query)
        # from celery.contrib import rdb; rdb.set_trace()
        # grab subscriptions
        logger.debug("pi_response: %s", pi_response)
        pi_cache_provider.upsert(pi_response)
        subscriptions = [x.invoice.subscription for x in pi_response if x.invoice]
        sub_cache_provider.upsert(subscriptions)
        # iterate through all pages of stripe payment intents
        while pi_response.has_more:
            pi_response = provider.fetch_payment_intents(query=customers_query, page=pi_response.next_page)
            pi_cache_provider.upsert(pi_response)
            subscriptions = [x.invoice.subscription for x in pi_response if x.invoice]
            sub_cache_provider.upsert(subscriptions)

        logger.info("Pulling uninvoiced subscriptions for %s", email_id)
        uninvoiced_subs = provider.fetch_uninvoiced_subscriptions_for_contributor()
        sub_cache_provider.upsert(uninvoiced_subs)
        pi_cache_provider.upsert_uninvoiced_subscriptions(
            [provider.cast_subscription_to_pi_for_portal(x) for x in uninvoiced_subs]
        )


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
