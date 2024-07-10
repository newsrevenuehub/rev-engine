import logging
import os
import time
import uuid

from django.conf import settings

import playwright._impl._errors
import stripe
from playwright.sync_api import expect, sync_playwright

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.models import Contribution, Contributor
from apps.e2e.choices import CommitStatusState
from apps.e2e.exceptions import E2EError
from apps.e2e.utils import E2eOutcome
from apps.organizations.models import RevenueProgram


ENV = settings.ENVIRONMENT
STANDING_NAMES = ("test", "staging", "sandbox", "dev", "demo")
_rp = RevenueProgram.objects.get(name=settings.E2E_RP_NAME)
CHECKOUT_PAGE_URL = os.environ.get(
    "CHECKOUT_PAGE_URL",
    f"https://{_rp.slug}.{settings.DOMAIN_APEX}/{_rp.default_donation_page.slug}/",
)
STRIPE_API_KEY = settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
VISA = "4242424242424242"
MASTER_CARD = "5555555555554444"
REVENUE_PROGRAM_NAME = _rp.name

logger = logging.getLogger(__name__)


def fill_out_contribution_form(
    amount: int,
    email: str,
    interval: str,
    first_name: str,
    last_name: str,
    phone: str,
    mailing_street: str,
    mailing_city: str,
    mailing_state: str,
    mailing_postal_code: str,
    mailing_country: str,
    mailing_country_selector: str,
    page_url: str = CHECKOUT_PAGE_URL,
) -> bytes | None:
    """Fill out the initial revengine form followed by Stripe payment element.

    Returns page screenshot bytes object.
    """
    browser = None
    page = None
    logger.info("Loading page %s", page_url)
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(page_url)
            expect(page).to_have_title(f"Join | {REVENUE_PROGRAM_NAME}")
            logger.info("Filling out first form.")
            page.locator(f"input[type='radio'][value='{interval}']").click()
            page.locator("input[name='amount']").press_sequentially(str(amount))
            page.locator("input[name='first_name']").press_sequentially(first_name)
            page.locator("input[name='last_name']").press_sequentially(last_name)
            page.locator("input[name='email']").press_sequentially(email)
            page.locator("input[name='phone']").press_sequentially(phone)
            page.locator("input[name='mailing_street']").type(mailing_street)
            page.keyboard.press("Tab")
            page.keyboard.press("Tab")
            page.locator("input[name='mailing_city']").press_sequentially(mailing_city)
            page.locator("input[name='mailing_state']").press_sequentially(mailing_state)
            page.locator("input[name='mailing_postal_code']").press_sequentially(mailing_postal_code)
            page.locator("input[name='mailing_country']").press_sequentially(mailing_country)
            page.click(mailing_country_selector)
            page.keyboard.press("Tab")
            page.keyboard.press("Enter")
            payment_form_iframe_title = "Secure payment input frame"
            page.wait_for_function(
                "selector => !!document.querySelector(selector)",
                arg=f"iframe[title='{payment_form_iframe_title}']",
            )
            stripe_iframe = None
            for iframe in page.query_selector_all("iframe"):
                if iframe.get_attribute("title") == payment_form_iframe_title:
                    stripe_iframe = iframe.content_frame()
                    break
            if stripe_iframe is None:
                raise E2EError("Stripe iframe not found")
            logger.info("Filling out payment form.")
            stripe_iframe.get_by_label("Card number").fill(VISA)
            stripe_iframe.get_by_label("Expiration").fill("12/28")
            stripe_iframe.get_by_label("CVC").fill("123")
            page.click("text=/Give \\$\\d+\\.\\d{2} USD once/")
            # Thank you page is separate and proof we made it through the whole flow
            page.wait_for_selector("text=Thank you")
            return page.screenshot()
        except playwright._impl._errors.Error as e:
            kwargs = {}
            if page:
                kwargs["screenshot"] = page.screenshot()
            raise E2EError("Error in playwright", **kwargs) from e
        finally:
            if browser:
                browser.close()


def assert_contribution(email: str, amount: int, interval: str) -> Contribution:
    """Assers that a contribution was created in the DB with the expected values."""
    logger.info("Checking DB side effects")
    try:
        contributor = Contributor.objects.get(email=email)
    except Contributor.DoesNotExist:
        raise E2EError("Contributor not found in DB") from None
    try:
        contribution = Contribution.objects.get(contributor=contributor)
    except Contribution.DoesNotExist as exc:
        raise E2EError("Contribution not found in DB") from exc
    problems = []
    for descriptor, fn in {
        "payment_count": lambda x: x.payment_set.count() == 1,
        "amount": lambda x: x.amount == amount,
        "interval": lambda x: x.interval == interval,
        "subscription_id": lambda x: (
            x.subscription_id is None if interval == ContributionInterval.ONE_TIME else bool(x.subscription_id)
        ),
        "status": lambda x: x.status == ContributionStatus.PAID,
    }.items():
        if not fn(contribution):
            problems.append(descriptor)
    if problems:
        raise E2EError(f"Problems with these characteristics of contribution: {', '.join(problems)}")
    return contribution


def assert_stripe_side_effects_for_subscription(
    payment_intent: stripe.PaymentIntent | None,
    subscription: stripe.Subscription | None,
):
    """Assert that the Stripe side effects of a subscription are as expected."""
    if not payment_intent:
        raise E2EError("No PaymentIntent ID")
    assert payment_intent.status == "succeeded"
    assert payment_intent.amount == AMOUNT * 100
    assert subscription.status == "active"
    assert subscription.items.data[0].price.product == settings.STRIPE_PRODUCT_ID_CONTRIBUTIONS
    # subscription metadata


def assert_stripe_side_effects(contribution):
    if contribution.interval == ContributionInterval.ONE_TIME:
        assert_stripe_side_effects_for_one_time(contribution=contribution)
    else:
        assert_stripe_side_effects_for_subscription(contribution=contribution)


def assert_stripe_side_effects_for_one_time(pi_id: str, stripe_account_id: str, amount: int) -> None:
    if not pi_id:
        raise E2EError("No PaymentIntent ID")
    stripe_pi = stripe.PaymentIntent.retrieve(
        pi_id,
        stripe_account=stripe_account_id,
        api_key=STRIPE_API_KEY,
    )
    for attr, val in (
        ("status", "succeeded"),
        ("amount", amount * 100),
    ):
        if not getattr(stripe_pi, attr, None) == val:
            raise E2EError(f"Expected {attr} to be {val}, got {getattr(stripe_pi, attr)}")


def make_email():
    return f"{str(uuid.uuid4())[:10]}{settings.E2E_CONTRIBUTOR_EMAIL_SUFFIX}@{settings.E2E_CONTRIBUTOR_EMAIL_DOMAIN}"


AMOUNT = 100
INTERVAL = "one_time"


def test_e2e() -> E2eOutcome:
    """End-to-end user flow for making a contribution."""
    logger.info("Starting checkout flow")
    email = make_email()
    details = None
    screenshot = None
    try:
        screenshot = fill_out_contribution_form(
            email=email,
            amount=AMOUNT,
            interval=INTERVAL,
            first_name="John",
            last_name="Doe",
            phone="5555555555",
            mailing_street="123 Main St",
            mailing_city="Anytown",
            mailing_state="NY",
            mailing_postal_code="12345",
            mailing_country="United States",
            mailing_country_selector="xpath=//li[normalize-space(.)='United States' and not(contains(., 'Minor Outlying Islands'))]",
        )
        # Note that if there are delays in webhook processing, it's possible to get apparent failures that may not necesarily be indicative
        # an underlying problem. That said, we don't want to wait for ages for the webhook to process.
        logger.info("Sleeping for 5 seconds to allow for async side effects to complete")
        time.sleep(5)
        logger.info("Checking side effects of checkout")
        contribution = assert_contribution(email, AMOUNT, INTERVAL)
        assert_stripe_side_effects(contribution)
        state = CommitStatusState.SUCCESS
    except E2EError as e:
        details = str(e)
        state = CommitStatusState.FAILURE
    return E2eOutcome(state=state, details=details, screenshot=screenshot)
