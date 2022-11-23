from django.conf import settings
from django.core.mail import send_mail
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string

from anymail.exceptions import AnymailAPIError
from celery import shared_task
from celery.utils.log import get_task_logger


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@shared_task(
    name="send_templated_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_templated_email(
    to, subject, text_template, html_template, template_data, from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER
):
    logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
    logger.debug(
        "`send_templated_email`\ntemplate_data: %s\n\ntext_template: %s\n\nhtml_template: %s",
        template_data,
        text_template,
        html_template,
    )
    send_mail(
        subject,
        render_to_string(text_template, template_data),
        from_email,
        [
            to,
        ],
        html_message=render_to_string(html_template, template_data),
    )


@shared_task(
    name="send_templated_email_with_attachment",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_templated_email_with_attachment(
    to,
    subject,
    text_template,
    template_data,
    attachment,
    content_type,
    filename,
    from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
):
    if not isinstance(to, (tuple, list)):
        to = (to,)

    mail = EmailMessage(
        subject=subject, body=render_to_string(text_template, template_data), from_email=from_email, to=to
    )
    mail.attach(filename=filename, content=attachment, mimetype=content_type)

    logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
    logger.debug(
        "`send_templated_email_with_attachment`\ntemplate_data: %s\n\ntext_template: %s\n\nfilename: %s\n\attachment: %s",
        template_data,
        text_template,
        filename,
        attachment,
    )

    mail.send()
