# Needed for postponing evaluation of annotations (because of "if TYPE_CHECKING")
# ref: https://peps.python.org/pep-0563/
from __future__ import annotations

import datetime
from dataclasses import asdict
from enum import Enum
from smtplib import SMTPException
from typing import TYPE_CHECKING, Literal, TypedDict
from urllib.parse import quote_plus

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.safestring import mark_safe

import stripe
from celery import shared_task
from celery.utils.log import get_task_logger
from sentry_sdk import configure_scope
from stripe.error import StripeError

from apps.contributions.choices import ContributionInterval
from apps.emails.helpers import convert_to_timezone_formatted
from apps.organizations.models import FreePlan, TransactionalEmailStyle


CONTRIBUTOR_DEFAULT_VALUE = "contributor"

if TYPE_CHECKING:  # pragma: no cover
    from apps.contributions.models import BillingHistoryItem, Contribution
    from apps.emails.helpers import ContributionReceiptCustomizations

logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTaskException(Exception):
    pass


@shared_task(
    name="send_templated_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(SMTPException,),
)
def send_templated_email(
    to, subject, message_as_text, message_as_html, from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER
):
    logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
    with configure_scope() as scope:
        scope.user = {"email": to}
        send_mail(
            subject,
            message_as_text,
            from_email,
            [
                to,
            ],
            html_message=message_as_html,
        )
        logger.info("Email sent to recipient `%s` with subject `%s`", to, subject)


class ContributionIntervals(Enum):
    ONE_TIME = ContributionInterval.ONE_TIME.value
    MONTH = ContributionInterval.MONTHLY.value
    YEAR = ContributionInterval.YEARLY.value


class SendContributionEmailData(TypedDict):
    contribution_amount: str
    contribution_interval: Literal[
        ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY, ContributionInterval.YEARLY
    ]
    contribution_interval_display_value: str
    copyright_year: int
    customizations: ContributionReceiptCustomizations
    rp_name: str
    contributor_name: str
    non_profit: bool
    fiscal_status: Literal["for-profit", "nonprofit", "fiscally sponsored"]
    fiscal_sponsor_name: str | None
    portal_url: str
    style: TransactionalEmailStyle
    timestamp: str
    contributor_email: str
    tax_id: str | None
    show_upgrade_prompt: bool
    billing_history: list[BillingHistoryItem] | None
    show_billing_history: bool
    default_contribution_page_url: str | None


class SendMagicLinkEmailData(TypedDict):
    magic_link: str
    email: str
    rp_name: str
    style: TransactionalEmailStyle


def generate_email_data(
    contribution: Contribution, show_billing_history: bool = False, custom_timestamp: str | None = None
) -> SendContributionEmailData:
    """Generate the data required to send a contribution email.

    Email templates supported by this function are:
    - nrh-default-contribution-confirmation-email.html
    - recurring-contribution-payment-updated.html
    - recurring-contribution-email-reminder.html
    - recurring-contribution-canceled.html

    Args:
    ----
        contribution: Contribution object
        show_billing_history: Whether to show the billing history in the email
        custom_timestamp: Timestamp to override the contribution created date

    """
    logger.info("called with contribution id %s", contribution.id)

    if not contribution.provider_customer_id:
        logger.error("No Stripe customer id for contribution with id %s", contribution.id)
        raise EmailTaskException("Cannot get required data from Stripe")
    try:
        customer = stripe.Customer.retrieve(
            contribution.provider_customer_id,
            stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
        )
    except StripeError as exc:
        logger.exception(
            "Something went wrong retrieving Stripe customer for contribution with id %s",
            contribution.id,
        )
        raise EmailTaskException("Cannot get required data from Stripe") from exc

    return SendContributionEmailData(
        contribution_amount=contribution.formatted_amount,
        # We are not formatting the "custom_timestamp" in "convert_to_timezone_formatted"
        # because we have places where the format is different.
        # Ex: upcoming charge reminders format is "MM/DD/YYYY"
        timestamp=custom_timestamp or convert_to_timezone_formatted(contribution.created, "America/New_York"),
        contribution_interval_display_value=(
            contribution.interval if contribution.interval != ContributionInterval.ONE_TIME else ""
        ),
        contribution_interval=contribution.interval,
        contributor_email=contribution.contributor.email,
        # `customer.name` could be non truthy, but if customer was created without providing value for `name`,
        # there will not be a `customer.name` attribute. This ensures we get default value in
        # both cases.
        contributor_name=getattr(customer, "name", CONTRIBUTOR_DEFAULT_VALUE) or CONTRIBUTOR_DEFAULT_VALUE,
        copyright_year=datetime.datetime.now(datetime.timezone.utc).year,
        customizations=contribution.revenue_program.get_contribution_receipt_email_customizations(),
        fiscal_sponsor_name=contribution.revenue_program.fiscal_sponsor_name,
        fiscal_status=contribution.revenue_program.fiscal_status,
        non_profit=contribution.revenue_program.non_profit,
        portal_url=mark_safe(contribution.revenue_program.contributor_portal_url),
        rp_name=contribution.revenue_program.name,
        style=asdict(contribution.revenue_program.transactional_email_style),
        tax_id=contribution.revenue_program.tax_id,
        show_upgrade_prompt=False,
        billing_history=contribution.get_billing_history(),
        show_billing_history=show_billing_history,
        default_contribution_page_url=(
            contribution.revenue_program.default_donation_page.page_url
            if contribution.revenue_program.default_donation_page
            else None
        ),
    )


def make_send_test_contribution_email_data(user, revenue_program) -> SendContributionEmailData:
    logger.info(
        "make_send_test_contribution_email_data: called with contribution user %s and rp %s",
        user.id,
        revenue_program.id,
    )

    now = timezone.now()
    name = f"{user.first_name} {user.last_name}" if (user.first_name and user.last_name) else "Sample Name"

    return SendContributionEmailData(
        contribution_amount="$123.45",
        timestamp=convert_to_timezone_formatted(now, "America/New_York"),
        contribution_interval_display_value=ContributionInterval.MONTHLY,
        contribution_interval=ContributionInterval.MONTHLY,
        contributor_email=user.email,
        contributor_name=name or CONTRIBUTOR_DEFAULT_VALUE,
        copyright_year=now.year,
        customizations=revenue_program.get_contribution_receipt_email_customizations(),
        fiscal_sponsor_name=revenue_program.fiscal_sponsor_name,
        fiscal_status=revenue_program.fiscal_status,
        non_profit=revenue_program.non_profit,
        portal_url=mark_safe(revenue_program.contributor_portal_url),
        rp_name=revenue_program.name,
        style=asdict(revenue_program.transactional_email_style),
        tax_id=revenue_program.tax_id,
        show_upgrade_prompt=revenue_program.organization.plan.name == FreePlan.name,
    )


def make_send_test_magic_link_email_data(user, revenue_program) -> SendMagicLinkEmailData:
    logger.info(
        "make_send_test_magic_link_email_data: called with contribution user %s and rp %s",
        user.id,
        revenue_program.id,
    )

    return SendMagicLinkEmailData(
        magic_link=get_test_magic_link(user, revenue_program),
        email=user.email,
        rp_name=revenue_program.name,
        style=asdict(revenue_program.transactional_email_style),
    )


def get_test_magic_link(user, revenue_program) -> str:
    # vs circular import
    from apps.api.serializers import ContributorObtainTokenSerializer  # noqa: PLC0415
    from apps.api.views import construct_rp_domain  # noqa: PLC0415
    from apps.contributions.models import Contributor  # noqa: PLC0415

    serializer = ContributorObtainTokenSerializer(data={"email": user.email, "subdomain": revenue_program.slug})
    serializer.is_valid(raise_exception=True)
    contributor = Contributor(email=user.email)
    serializer.update_short_lived_token(contributor)
    token = serializer.validated_data["access"]
    domain = construct_rp_domain(serializer.validated_data.get("subdomain", ""), None)
    return f"https://{domain}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={quote_plus(user.email)}"


@shared_task(
    name="send_receipt_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(SMTPException,),
)
def send_receipt_email(data: SendContributionEmailData) -> None:
    """Retrieve Stripe customer and send receipt email for a contribution."""
    logger.info("send_receipt_email: Attempting to send receipt email with the following template data %s", data)
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
    autoretry_for=(SMTPException,),
)
def send_templated_email_with_attachment(
    to: str | list[str],
    subject: str,
    message_as_text: str,
    message_as_html: str,
    attachment,
    content_type,
    filename,
    from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
):
    with configure_scope() as scope:
        scope.user = {"email": to}
        if not isinstance(to, tuple | list):
            to = (to,)
        mail = EmailMultiAlternatives(subject=subject, body=message_as_text, from_email=from_email, to=to)
        mail.attach(
            filename=filename, content=attachment.encode("utf-8", errors="backslashreplace"), mimetype=content_type
        )
        mail.attach_alternative(message_as_html, "text/html")
        logger.info("Sending email to recipient `%s` with subject `%s`", to, subject)
        mail.send()
