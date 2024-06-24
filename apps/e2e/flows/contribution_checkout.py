import logging
import os
import time
import uuid

from django.conf import settings

import stripe
from playwright.sync_api import Page, expect, sync_playwright

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.models import Contribution, Contributor
from apps.e2e.tasks import E2eOutCome


ENV = settings.ENVIRONMENT
STANDING_NAMES = ("test", "staging", "sandbox", "dev", "demo")
CHECKOUT_PAGE_URL = os.environ.get(
    "CHECKOUT_PAGE_URL",
    f"https://billypenn{f'-{ENV}' if ENV not in STANDING_NAMES else ''}.{settings.DOMAIN_APEX}/donate/",
)
STRIPE_API_KEY = settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS
VISA = "4242424242424242"
MASTER_CARD = "5555555555554444"
REVENUE_PROGRAM_NAME = "Billy Penn"

logger = logging.getLogger(__name__)


class E2EError(Exception):
    pass


class E2EAssertionError(E2EError):
    pass


def fill_out_contribution_form(
    page: Page,
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
):
    """Loads contribution page, and fills out first form, submits it, then fills out Stripe Payment element."""
    logger.info("Loading page %s", page_url)
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


def assert_contribution(email: str, amount: int, interval: str) -> Contribution:
    """Asserts that a contribution was created in the DB with the expected values."""
    logger.info("Checking DB side effects")
    try:
        contributor = Contributor.objects.get(email=email)
    except Contributor.DoesNotExist:
        raise E2EAssertionError("Contributor not found in DB") from None
    try:
        contribution = Contribution.objects.get(contributor=contributor)
    except Contribution.DoesNotExist as exc:
        raise E2EError("Contribution not found in DB") from exc
    assert contribution.payment_set.count() == 1
    assert contribution.amount == amount
    assert contribution.interval == interval
    if not interval == ContributionInterval.ONE_TIME:
        assert contribution.subscription_id
    else:
        assert contribution.subscription_id is None
    assert contribution.status == ContributionStatus.PAID
    return contribution


def assert_stripe_side_effects_for_subscription(
    payment_intent: stripe.PaymentIntent | None,
    subscription: stripe.Subscription | None,
):
    """Asserts that the Stripe side effects of a subscription are as expected."""
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
    # TODO: Assert about the metadata


def make_email():
    return f"{str(uuid.uuid4())[:10]}+approved@example.com"


AMOUNT = 100
INTERVAL = "one_time"


class E2eOutCome:
    status: str
    decription: str


def e2e_test_contribution_checkout():
    logger.info("Starting checkout flow")
    # don't do django quries in this context, they'll be somewhat inexpelibly async despite
    # using with sync_playwright() as p below.
    email = make_email()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            fill_out_contribution_form(
                email=email,
                page=page,
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
            browser.close()
        logger.info("Sleeping for 5 seconds to allow for async side effects to complete")
        time.sleep(5)
        logger.info("Checking side effects of checkout")
        contribution = assert_contribution(email, AMOUNT, INTERVAL)
        assert_stripe_side_effects(contribution)
    except E2EError as e:
        logger.exception("Error in checkout db side effects")
        return E2eOutCome(status="failed", description=str(e))
    else:
        logger.info("Checkout flow succeeded")
        return E2eOutCome(status="passed", description="")
    finally:
        logger.info("End of checkout flow")
