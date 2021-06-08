import logging
import time

from django.conf import settings
from django.utils import timezone

import requests
from celery import shared_task
from requests.exceptions import RequestException

from apps.contributions.models import Contribution
from apps.contributions.payment_managers import PaymentProviderError


logger = logging.getLogger(__name__)


def ping_healthchecks(check_name, healthcheck_url):  # pragma: no cover
    """Attempt to ping a healthchecks.io to enable monitoring of tasks"""
    if not healthcheck_url:
        logger.info(f"URL for {check_name} for not available in this environment")
        return
    for attempt in range(1, 4):
        try:
            requests.get(healthcheck_url, timeout=1)
            break
        except RequestException:
            logger.info(f"Request {attempt} for {check_name} healthcheck failed")
        time.sleep(1)


@shared_task
def auto_accept_flagged_contributions():
    contributions = Contribution.objects.filter(status=Contribution.FLAGGED[0])
    logger.info(f"Found {len(contributions)} flagged contributions")

    successful_captures = 0
    failed_captures = 0

    now = timezone.now()
    eligible_flagged_contributions = Contribution.objects.filter(
        status=Contribution.FLAGGED[0], flagged_date__lte=now - settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA
    )
    for contribution in eligible_flagged_contributions:
        payment_intent = contribution.get_payment_manager_instance()
        try:
            payment_intent.complete_payment(reject=False)
            successful_captures += 1
        except PaymentProviderError:
            failed_captures += 1

    logger.info(f"Successfully captured {successful_captures} previously-held payments.")
    if failed_captures:
        logger.warn(f"Failed to capture {failed_captures} previously-held payments")

    ping_healthchecks("auto_accept_flagged_contributions", settings.HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS)
    return successful_captures, failed_captures
