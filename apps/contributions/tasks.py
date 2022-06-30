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
from apps.contributions.stripe_contributions_provider import (
    append_stripe_charges_to_cache,
    fetch_stripe_charges,
    fetch_stripe_customers,
    prepare_customers_query,
    save_stripe_charges_to_cache,
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
def task_pull_serialized_stripe_contributions_to_cache(self, email_id):
    customers_result = fetch_stripe_customers(email_id)
    for customer_query in prepare_customers_query(customers_result):
        task_pull_charges.delay(email_id, customer_query)


@shared_task(bind=True, autoretry_for=(RateLimitError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def task_pull_charges(self, email_id, customers_query):
    charge_response = fetch_stripe_charges(query=customers_query)
    save_stripe_charges_to_cache(email_id, charge_response)
    while charge_response.has_more:
        charge_response = fetch_stripe_charges(query=customers_query, page=charge_response.next_page)
        append_stripe_charges_to_cache(email_id, charge_response)
