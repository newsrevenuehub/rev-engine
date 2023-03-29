from dataclasses import asdict
from enum import Enum
from typing import Literal, TypedDict

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string

import stripe
from anymail.exceptions import AnymailAPIError
from celery import shared_task
from celery.utils.log import get_task_logger
from sentry_sdk import configure_scope
from stripe.error import StripeError

from apps.contributions.choices import ContributionInterval
from apps.emails.helpers import convert_to_timezone_formatted
from apps.organizations.models import FiscalStatusChoices


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTaskException(Exception):
    pass


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
    with configure_scope() as scope:
        scope.user = {"email": to}
        send_mail(
            subject,
            render_to_string(text_template, template_data),
            from_email,
            [
                to,
            ],
            html_message=render_to_string(html_template, template_data),
        )


class FiscalStatuses(Enum):
    FISCALLY_SPONSORED = FiscalStatusChoices.FISCALLY_SPONSORED.value
    FOR_PROFIT = FiscalStatusChoices.FOR_PROFIT.value
    NON_PROFIT = FiscalStatusChoices.NONPROFIT.value


class ContributionIntervals(Enum):
    ONE_TIME = ContributionInterval.ONE_TIME.value
    MONTH = ContributionInterval.MONTHLY.value
    YEAR = ContributionInterval.YEARLY.value


class SendThankYouEmailData(TypedDict):
    contribution_amount: str
    contribution_interval: Literal[
        ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY, ContributionInterval.YEARLY
    ]
    contribution_interval_display_value: str
    copyright_year: int
    rp_name: str
    contributor_name: str
    non_profit: bool
    fiscal_status: Literal[FiscalStatuses.FISCALLY_SPONSORED, FiscalStatuses.FOR_PROFIT, FiscalStatuses.NON_PROFIT]
    fiscal_sponsor_name: str
    magic_link: str
    style: dict
    contribution_date: str
    contributor_email: str
    tax_id: str


# would like to have type hint for contribution but that would cause a circular import because need to import class to this file
def make_send_thank_you_email_data(contribution) -> SendThankYouEmailData:
    # vs circular import
    from apps.contributions.models import Contributor

    if not contribution.provider_customer_id:
        logger.error(
            "make_send_thank_you_email_data: No Stripe customer id for contribution with id %s", contribution.id
        )
        raise EmailTaskException("Cannot get required data from Stripe")
    try:
        customer = stripe.Customer.retrieve(
            contribution.provider_customer_id,
            stripe_account=contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
    except StripeError:
        logger.exception(
            "make_send_thank_you_email_data: Something went wrong retrieving Stripe customer for contribution with id %s",
            contribution.id,
        )
        raise EmailTaskException("Cannot get required data from Stripe")

    return SendThankYouEmailData(
        contribution_amount=contribution.formatted_amount,
        contribution_date=convert_to_timezone_formatted(contribution.created, "America/New_York"),
        contribution_interval_display_value=contribution.interval
        if contribution.interval != ContributionInterval.ONE_TIME
        else "",
        contribution_interval=contribution.interval,
        contributor_email=contribution.contributor.email,
        contributor_name=customer.name,
        copyright_year=contribution.created.year,
        fiscal_sponsor_name=contribution.revenue_program.fiscal_sponsor_name,
        fiscal_status=contribution.revenue_program.fiscal_status,
        magic_link=Contributor.create_magic_link(contribution),
        non_profit=contribution.revenue_program.non_profit,
        rp_name=contribution.revenue_program.name,
        style=asdict(contribution.donation_page.revenue_program.transactional_email_style),
        tax_id=contribution.revenue_program.tax_id,
    )


@shared_task(
    name="send_thank_you_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_thank_you_email(data: SendThankYouEmailData) -> None:
    """Retrieve Stripe customer and send thank you email for a contribution"""
    logger.info("send_thank_you_email: Attempting to send thank you email with the following template data %s", data)
    with configure_scope() as scope:
        scope.user = {"email": (to := data["contributor_email"])}
        send_mail(
            subject="Thank you for your contribution!",
            message=render_to_string("nrh-default-contribution-confirmation-email.txt", data),
            from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
            recipient_list=[to],
            html_message=render_to_string("nrh-default-contribution-confirmation-email.html", data),
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
    html_template,
    template_data,
    attachment,
    content_type,
    filename,
    from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
):
    with configure_scope() as scope:
        scope.user = {"email": to}

        if not isinstance(to, (tuple, list)):
            to = (to,)

        mail = EmailMultiAlternatives(
            subject=subject, body=render_to_string(text_template, template_data), from_email=from_email, to=to
        )
        mail.attach(
            filename=filename, content=attachment.encode("utf-8", errors="backslashreplace"), mimetype=content_type
        )
        mail.attach_alternative(render_to_string(html_template, template_data), "text/html")

        logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
        logger.debug(
            "`send_templated_email_with_attachment`\ntemplate_data: %s\n\ntext_template: %s\n\nfilename: %s\n\attachment: %s",
            template_data,
            text_template,
            filename,
            attachment,
        )
        mail.send()
