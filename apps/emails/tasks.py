from django.conf import settings

from anymail.exceptions import AnymailAPIError
from anymail.message import AnymailMessage
from celery import shared_task
from celery.utils.log import get_task_logger


DEFAULT_CONTRIBUTION_CONFIRMATION_EMAIL_SUBJECT = "Thank you for your contribution!"


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTaskError(Exception):
    pass


@shared_task(
    name="send_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_email(identifier, to, subject, template_data):
    message = AnymailMessage()
    message.template_id = identifier
    message.to = [to]
    message.subject = subject
    message.merge_global_data = template_data
    message.send()


@shared_task(
    name="send_contribution_confirmation_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_contribution_confirmation_email(
    to,
    subject=DEFAULT_CONTRIBUTION_CONFIRMATION_EMAIL_SUBJECT,
    esp_template_id=settings.ESP_TEMPLATE_ID_FOR_CONTRIBUTION_CONFIRMATION,
    **template_data,
):
    if not esp_template_id:
        raise EmailTaskError("`esp_template_id` must be set")
    return send_email(esp_template_id, to, subject, template_data)
