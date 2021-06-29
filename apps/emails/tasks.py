from django.conf import settings

import celery
from anymail.exceptions import AnymailAPIError
from celery import shared_task
from celery.utils.log import get_task_logger


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class BaseTaskWithRetry(celery.Task):
    autoretry_for = (AnymailAPIError,)
    max_retries = 5
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = False
    bind = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"{task_id} failed: {exec}")


@shared_task(base=BaseTaskWithRetry, name="send_donation_email")
def send_donation_email(message):
    logger.info("Sending a donation email")
    message.send()
