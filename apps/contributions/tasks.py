import time

from django.conf import settings
from django.utils import timezone

import requests
from celery import shared_task
from celery.utils.log import get_task_logger
from requests.exceptions import RequestException
from stripe.error import RateLimitError

from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError
from apps.contributions.serializers import PaymentProviderContributionSerializer
from apps.contributions.stripe_contributions_provider import (
    ContributionsCacheProvider,
    StripeCharge,
    StripeContributionsProvider,
)


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def ping_healthchecks(check_name, healthcheck_url):  # pragma: no cover
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
    contributions = Contribution.objects.filter(status=ContributionStatus.FLAGGED)
    logger.info("Found %s flagged contributions", len(contributions))

    successful_captures = 0
    failed_captures = 0

    now = timezone.now()
    eligible_flagged_contributions = Contribution.objects.filter(
        status=ContributionStatus.FLAGGED, flagged_date__lte=now - settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA
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
    """Pull all charges for a given email associated with a stripe account."""
    provider = StripeContributionsProvider(email_id, stripe_account_id)
    # trigger async tasks to pull charges for a given set of customer queries, if there are two queries
    # the task will get triggered two times which are asynchronous
    for customer_query in provider.generate_chunked_customers_query():
        task_pull_charges.delay(email_id, customer_query, stripe_account_id)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_pull_charges(self, email_id, customers_query, stripe_account_id):
    """Pull all charges from stripe for a given set of customers."""
    provider = StripeContributionsProvider(email_id, stripe_account_id)
    cache_provider = ContributionsCacheProvider(
        email_id,
        stripe_account_id,
        serializer=PaymentProviderContributionSerializer,
        converter=StripeCharge,
    )
    charge_response = provider.fetch_charges(query=customers_query)
    cache_provider.upsert(charge_response)

    # iterate through all pages of stripe charges
    while charge_response.has_more:
        charge_response = provider.fetch_charges(query=customers_query, page=charge_response.next_page)
        cache_provider.upsert(charge_response)
