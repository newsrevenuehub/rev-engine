import logging
import os
import time
import uuid

from django.conf import settings

import pytest
import stripe
from playwright.sync_api import Page, expect, sync_playwright

from apps.contributions.models import Contribution, Contributor


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
    """Fill out both forms in checkout flow."""
    logger.info("Loading page %s", page_url)
    page.goto(page_url)
    expect(page).to_have_title(f"Join | {REVENUE_PROGRAM_NAME}")
    # fill out initial checkout form
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

    # we now wait for the Stripe payment element to load, which happens after initial form
    # submission
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

    # fill out Stripe payment form
    stripe_iframe.get_by_label("Card number").fill(VISA)
    stripe_iframe.get_by_label("Expiration").fill("12/28")
    stripe_iframe.get_by_label("CVC").fill("123")
    page.screenshot(path="checkout_form_filled.png")

    page.click("text=/Give \\$\\d+\\.\\d{2} USD once/")
    # contributor gets to thank you page, signaling success
    page.wait_for_selector("text=Thank you")


@pytest.mark.django_db()
def assert_db_side_effects(email: str, amount: int, interval: str) -> Contribution:
    logger.info("Checking DB side effects")
    try:
        contributor = Contributor.objects.get(email=email)
    except Contributor.DoesNotExist as exc:
        raise E2EError("Contributor not found in DB") from exc
    try:
        contribution = Contribution.objects.get(contributor=contributor)
    except Contribution.DoesNotExist as exc:
        raise E2EError("Contribution not found in DB") from exc
    assert contribution.payment_set.count() == 1
    assert contribution.amount == amount
    assert contribution.interval == interval
    assert contribution.status == "paid"
    return contribution


def assert_stripe_side_effects(pi_id: str, stripe_account_id: str, amount: int) -> None:
    stripe_pi = stripe.PaymentIntent.retrieve(
        pi_id,
        stripe_account=stripe_account_id,
        api_key=STRIPE_API_KEY,
    )
    assert stripe_pi.status == "succeeded"
    assert stripe_pi.amount == amount * 100


@pytest.fixture()
def email():
    return f"{uuid.uuid4()}@example.com"


AMOUNT = 100
INTERVAL = "one_time"


@pytest.fixture()
def _do_checkout(email, amount=AMOUNT, interval=INTERVAL):
    logger.info("Filling out contribution form")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        fill_out_contribution_form(
            email=email,
            page=page,
            amount=amount,
            interval=interval,
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
        logger.info("Napping to pass Stripe webhook processing time")
        time.sleep(5)


@pytest.mark.usefixtures("_do_checkout")
@pytest.mark.django_db()
def test_checkout(email):
    logger.info("Checking side effects of checkout")
    try:
        contribution = assert_db_side_effects(email, AMOUNT, INTERVAL)
    except E2EError as e:
        logger.exception("Error in checkout db side effects")
        pytest.fail(str(e))
    else:
        pi_id = contribution.provider_payment_id
        assert pi_id is not None
        assert_stripe_side_effects(pi_id, contribution.stripe_account_id, AMOUNT)
