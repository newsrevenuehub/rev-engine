import os
import time

import stripe
from playwright.sync_api import Page, expect


ENVIRONMENT = os.environ["ENVIRONMENT"]
DOMAIN = os.environ["DOMAIN"]
STANDING_NAMES = ("test", "staging", "sandbox", "dev", "demo")
DEFAULT_CHECKOUT_URL = f"https://billypenn{f'-{ENVIRONMENT}' if ENVIRONMENT not in STANDING_NAMES else ''}.{DOMAIN}"
CHECKOUT_PAGE_URL = os.environ.get("CHECKOUT_PAGE_URL", DEFAULT_CHECKOUT_URL)
STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
VISA = "4242424242424242"
MASTER_CARD = "5555555555554444"
REVENUE_PROGRAM_NAME = "Billy Penn"

DATABASE_URL = os.environ["DATABASE_URL"]


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
    page_url: str = config.CHECKOUT_PAGE_URL,
):
    """This spans the entire checkout flow, which consists of two distinct forms that are submitted in sequence."""
    page.goto(page_url)
    expect(page).to_have_title(f"Join | {config.REVENUE_PROGRAM_NAME}")

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
        raise Exception("Stripe iframe not found")

    # fill out Stripe payment form
    stripe_iframe.get_by_label("Card number").fill(config.VISA)
    stripe_iframe.get_by_label("Expiration").fill("12/28")
    stripe_iframe.get_by_label("CVC").fill("123")
    page.click("text=/Give \\$\\d+\\.\\d{2} USD once/")
    # contributor gets to thank you page, signaling success
    page.wait_for_selector("text=Thank you")


def assert_db_side_effects(email: str, amount: int, models, interval: str) -> tuple:
    Contribution = models["contributions_contribution"]
    Contributor = models["contributions_contributor"]
    # Payment = models["contributions_payment"]
    Page = models["pages_donationpage"]
    RevenueProgram = models["organizations_revenueprogram"]
    PaymentProvider = models["organizations_paymentprovider"]

    assert (contributor := Contributor.get_or_none(email=email)) is not None
    assert (contribution := Contribution.get_or_none(contributor=contributor)) is not None
    assert (page := Page.get_or_none(id=contribution.donation_page)) is not None
    assert (revenue_program := RevenueProgram.get_or_none(id=page.revenue_program)) is not None
    assert (payment_provider := PaymentProvider.get_or_none(id=revenue_program.payment_provider)) is not None

    # This gets added after DEV-4032 is merged upstream in revengine
    # assert Payment.select().where(Payment.contribution == contribution).count() == 1
    assert contribution.amount == amount * 100
    assert contribution.interval == interval
    assert contribution.status == "paid"
    return contribution, contributor, page, revenue_program, payment_provider


def assert_stripe_side_effects(pi_id: str, stripe_account_id: str, amount: int) -> None:
    stripe_pi = stripe.PaymentIntent.retrieve(
        pi_id,
        stripe_account=stripe_account_id,
        api_key=config.STRIPE_API_KEY,
    )
    assert stripe_pi.status == "succeeded"


def assert_receipt_email_sent(email: str, username: str, password: str) -> None:
    pass


def test_checkout(page: Page, models, email):
    fill_out_contribution_form(
        email=email,
        page=page,
        amount=(amount := 100),
        interval=(interval := "one_time"),
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
    print("Napping to pass Stripe webhook processing time")
    time.sleep(5)
    contribution, _, _, _, payment_provider = assert_db_side_effects(email, amount, models, interval)
    assert (pi_id := contribution.provider_payment_id) is not None
    assert_stripe_side_effects(pi_id, payment_provider.stripe_account_id, amount)
