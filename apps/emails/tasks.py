# Needed for postponing evaluation of annotations (because of "if TYPE_CHECKING")
# ref: https://peps.python.org/pep-0563/
from __future__ import annotations

from dataclasses import asdict
from enum import Enum
from typing import TYPE_CHECKING, Literal, TypedDict
from urllib.parse import quote_plus

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils import timezone

import stripe
from anymail.exceptions import AnymailAPIError
from celery import shared_task
from celery.utils.log import get_task_logger
from sentry_sdk import configure_scope
from stripe.error import StripeError

from apps.contributions.choices import ContributionInterval
from apps.emails.helpers import convert_to_timezone_formatted
from apps.organizations.models import FiscalStatusChoices, FreePlan, TransactionalEmailStyle


if TYPE_CHECKING:
    from apps.contributions.models import BillingHistoryItem, Contribution

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


class FiscalStatuses(Enum):
    FISCALLY_SPONSORED = FiscalStatusChoices.FISCALLY_SPONSORED.value
    FOR_PROFIT = FiscalStatusChoices.FOR_PROFIT.value
    NON_PROFIT = FiscalStatusChoices.NONPROFIT.value


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
    rp_name: str
    contributor_name: str
    non_profit: bool
    fiscal_status: Literal[FiscalStatuses.FISCALLY_SPONSORED, FiscalStatuses.FOR_PROFIT, FiscalStatuses.NON_PROFIT]
    fiscal_sponsor_name: str | None
    magic_link: str
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


def make_send_thank_you_email_data(
    contribution: Contribution, show_billing_history: bool = False, custom_timestamp: str | None = None
) -> SendContributionEmailData:
    logger.info("make_send_than_you_email_data: called with contribution id %s", contribution.id)

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
            stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
        )
    except StripeError as exc:
        logger.exception(
            "make_send_thank_you_email_data: Something went wrong retrieving Stripe customer for contribution with id %s",
            contribution.id,
        )
        raise EmailTaskException("Cannot get required data from Stripe") from exc

    return SendContributionEmailData(
        contribution_amount=contribution.formatted_amount,
        timestamp=custom_timestamp or convert_to_timezone_formatted(contribution.created, "America/New_York"),
        contribution_interval_display_value=(
            contribution.interval if contribution.interval != ContributionInterval.ONE_TIME else ""
        ),
        contribution_interval=contribution.interval,
        contributor_email=contribution.contributor.email,
        contributor_name=customer.name or "contributor",
        copyright_year=contribution.created.year,
        fiscal_sponsor_name=contribution.revenue_program.fiscal_sponsor_name,
        fiscal_status=contribution.revenue_program.fiscal_status,
        magic_link=Contributor.create_magic_link(contribution),
        non_profit=contribution.revenue_program.non_profit,
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
        contributor_name=name or "contributor",
        copyright_year=now.year,
        fiscal_sponsor_name=revenue_program.fiscal_sponsor_name,
        fiscal_status=revenue_program.fiscal_status,
        magic_link=get_test_magic_link(user, revenue_program),
        non_profit=revenue_program.non_profit,
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
    from apps.api.serializers import ContributorObtainTokenSerializer
    from apps.api.views import construct_rp_domain
    from apps.contributions.models import Contributor

    serializer = ContributorObtainTokenSerializer(data={"email": user.email, "subdomain": revenue_program.slug})
    serializer.is_valid(raise_exception=True)
    contributor = Contributor(email=user.email)
    serializer.update_short_lived_token(contributor)
    token = serializer.validated_data["access"]
    domain = construct_rp_domain(serializer.validated_data.get("subdomain", ""), None)
    return f"https://{domain}/{settings.CONTRIBUTOR_VERIFY_URL}?token={token}&email={quote_plus(user.email)}"


@shared_task(
    name="send_thank_you_email",
    max_retries=5,
    retry_backoff=True,
    retry_jitter=False,
    autoretry_for=(AnymailAPIError,),
)
def send_thank_you_email(data: SendContributionEmailData) -> None:
    """Retrieve Stripe customer and send thank you email for a contribution."""
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
