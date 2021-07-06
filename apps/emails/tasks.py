from django.conf import settings

from anymail.exceptions import AnymailAPIError
from anymail.message import AnymailMessage
from celery import shared_task
from celery.utils.log import get_task_logger


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@shared_task(
    name="send_donor_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_donor_email(identifier, to, subject, template_data):  # pragma: no cover
    logger.info("Sending a donation email")
    message = AnymailMessage()
    message.template_id = identifier
    message.to = [to]
    message.subject = subject
    message.merge_global_data = template_data
    message.send()
