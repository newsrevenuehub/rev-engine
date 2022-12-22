from django.conf import settings
from django.core.mail import send_mail
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string

import stripe
from anymail.exceptions import AnymailAPIError
from celery import shared_task
from celery.utils.log import get_task_logger
from stripe.error import StripeError

from apps.emails.helpers import convert_to_timezone_formatted


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
    name="send_thank_you_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_thank_you_email(contribution_id: int) -> None:
    """Retrieve Stripe customer and send thank you email for a contribution"""
    # vs circular import
    from apps.contributions.models import Contribution, Contributor

    try:
        contribution = Contribution.objects.get(
            id=contribution_id,
            provider_customer_id__isnull=False,
            donation_page__isnull=False,
            donation_page__revenue_program__isnull=False,
            donation_page__revenue_program__payment_provider__isnull=False,
        )
        customer = stripe.Customer.retrieve(
            contribution.provider_customer_id,
            stripe_account=contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )

    except StripeError as exc:
        logger.exception("Something went wrong retrieving Stripe customer for contribution with id %s", contribution_id)
        raise exc

    send_templated_email(
        contribution.contributor.email,
        "Thank you for your contribution!",
        "nrh-default-contribution-confirmation-email.txt",
        "nrh-default-contribution-confirmation-email.html",
        {
            "contribution_date": convert_to_timezone_formatted(contribution.created, "America/New_York"),
            "contributor_email": contribution.contributor.email,
            "contribution_amount": contribution.formatted_amount,
            "contribution_interval": contribution.interval,
            "contribution_interval_display_value": contribution.interval
            if contribution.interval != "one_time"
            else None,
            "copyright_year": contribution.created.year,
            "rp_name": contribution.revenue_program.name,
            "contributor_name": customer.name,
            "non_profit": contribution.revenue_program.non_profit,
            "tax_id": contribution.revenue_program.tax_id,
            "magic_link": Contributor.create_magic_link(contribution),
        },
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
    mail.attach(filename=filename, content=attachment.encode("utf-8", errors="backslashreplace"), mimetype=content_type)

    logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
    logger.debug(
        "`send_templated_email_with_attachment`\ntemplate_data: %s\n\ntext_template: %s\n\nfilename: %s\n\attachment: %s",
        template_data,
        text_template,
        filename,
        attachment,
    )

    mail.send()
