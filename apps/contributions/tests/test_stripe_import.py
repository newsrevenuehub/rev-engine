import datetime
from copy import deepcopy

from django.conf import settings

import pytest
import stripe

from apps.contributions.exceptions import (
    InvalidIntervalError,
    InvalidMetadataError,
    InvalidStripeTransactionDataError,
)
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.stripe_import import (
    MAX_STRIPE_RESPONSE_LIMIT,
    PaymentIntentForOneTimeContribution,
    StripeEventProcessor,
    StripeTransactionsImporter,
    SubscriptionForRecurringContribution,
    parse_slug_from_url,
    upsert_payment_for_transaction,
)
from apps.contributions.tests.factories import ContributionFactory, PaymentFactory
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.fixture
def balance_transaction(mocker):
    return mocker.Mock(
        id="bt_1",
        net=1000,
        amount=1000,
        created=datetime.datetime.now().timestamp(),
    )


@pytest.fixture
def balance_transaction_for_refund(mocker):
    return mocker.Mock(
        id="bt_2",
        net=-1000,
        amount=-1000,
        created=datetime.datetime.now().timestamp(),
    )


@pytest.fixture
def refund(mocker, balance_transaction_for_refund):
    refund = mocker.Mock(amount=1000, balance_transaction=balance_transaction_for_refund)
    return refund


@pytest.fixture
def payment_intent(mocker, charge, customer, valid_metadata):
    charges = mocker.Mock(total_count=1, data=[charge])
    pm = mocker.Mock(id="pm_1")
    pm.to_dict.return_value = {"foo": "bar"}
    return mocker.Mock(
        id="pi_1",
        amount=1000,
        charges=charges,
        status="succeeded",
        currency="usd",
        metadata=valid_metadata,
        payment_method=pm,
        # this implies it's a one-time charge
        invoice=None,
        customer=customer,
    )


@pytest.fixture
def payment_intent_for_recurring_contribution(mocker, charge, customer, valid_metadata, invoice_with_subscription):
    charges = mocker.Mock(total_count=1, data=[charge])
    pm = mocker.Mock(id="pm_1")
    pm.to_dict.return_value = {"foo": "bar"}
    return mocker.Mock(
        id="pi_1",
        amount=1000,
        charges=charges,
        status="succeeded",
        currency="usd",
        metadata=valid_metadata,
        payment_method=pm,
        invoice=invoice_with_subscription,
        customer=customer,
    )


@pytest.fixture
def invoice_with_subscription(mocker):
    return mocker.Mock(subscription="sub_1", id="inv_1")


@pytest.fixture
def invoice_without_subscription(mocker):
    return mocker.Mock(subscription=None)


@pytest.fixture
def mock_metadata_validator(mocker):
    return mocker.patch("apps.contributions.stripe_import.cast_metadata_to_stripe_payment_metadata_schema")


@pytest.fixture
def valid_metadata(valid_metadata, domain_apex):
    """We shadow the valid_metadata from conftest.py so we can set up rp and donation page that will
    cause validation around donation page work as expected in tests.
    """
    rp = RevenueProgramFactory(id=valid_metadata["revenue_program_id"])
    page = DonationPageFactory(revenue_program=rp, slug="slug")
    valid_metadata["referer"] = f"https://{domain_apex}/{page.slug}/"
    return valid_metadata


@pytest.fixture
def subscription(mocker, customer, valid_metadata):
    plan = mocker.Mock(amount=1000, currency="usd", interval="month", interval_count=1)
    payment_method = mocker.Mock(id="pm_1")
    payment_method.to_dict.return_value = {"foo": "bar"}
    return mocker.Mock(
        id="sub_1",
        customer=customer,
        metadata=valid_metadata,
        plan=plan,
        currency="usd",
        status="active",
        default_payment_method=payment_method,
    )


@pytest.fixture
def customer(mocker):
    return mocker.Mock(email="foo@bar.com", id="cus_1", invoice_settings=None)


@pytest.fixture
def charge(mocker, balance_transaction, customer):
    return mocker.Mock(
        amount=1000,
        created=datetime.datetime.now().timestamp(),
        balance_transaction=balance_transaction,
        customer=customer,
        refunded=False,
        amount_refunded=0,
        refunds=mocker.Mock(total_count=0, data=[]),
        status="succeeded",
    )


@pytest.fixture
def subscription_with_existing_nre_entities(subscription):
    ContributionFactory(provider_subscription_id=subscription.id, contributor__email=subscription.customer.email)
    return subscription


@pytest.fixture
def payment_method_A(mocker):
    return mocker.Mock(id="pm_A")


@pytest.fixture
def payment_method_B(mocker):
    return mocker.Mock(id="pm_B")


@pytest.fixture
def customer_no_invoice_settings(customer):
    customer = deepcopy(customer)
    customer.invoice_settings = None
    return customer


@pytest.fixture
def customer_with_invoice_settings(customer, mocker, payment_method_A):
    customer = deepcopy(customer)
    customer.invoice_settings = mocker.Mock(default_payment_method=payment_method_A)
    return customer


class Test_parse_slug_from_url:

    @pytest.fixture(
        params=[
            ("https://{}/slug/", "slug"),
            ("https://{}/slug", "slug"),
            ("https://{}/", None),
            ("https://{}", None),
            ("https://{}/slug/other", "slug"),
            ("https://{}/slug/other/", "slug"),
            ("https://{}/slug/?foo=bar", "slug"),
            ("https://{}/slug?foo=bar", "slug"),
        ]
    )
    def url_case(self, request, domain_apex):
        return request.param[0].format(domain_apex), request.param[1]

    def test_parse_slug_from_url_when_allowed_domain(self, url_case):
        url, expect = url_case
        if expect:
            assert parse_slug_from_url(url) == expect
        else:
            assert parse_slug_from_url(url) is None

    def test_parse_slug_from_url_when_not_allowed_domain(self):
        with pytest.raises(InvalidStripeTransactionDataError) as exc:
            parse_slug_from_url((url := "https://random-and-malicious.com/slug/"))
        assert str(exc.value) == f"URL {url} has a TLD that is not allowed for import"


@pytest.mark.django_db
class Test_upsert_payment_for_transaction:
    @pytest.fixture
    def contribution(self):
        return ContributionFactory()

    @pytest.mark.parametrize("payment_exists", (True, False))
    @pytest.mark.parametrize("is_refund", [True, False])
    def test_happy_path(self, payment_exists, is_refund, contribution, balance_transaction):
        if payment_exists:
            PaymentFactory(
                contribution=contribution,
                stripe_balance_transaction_id=balance_transaction.id,
            )
        payment, action = upsert_payment_for_transaction(
            contribution=contribution, transaction=balance_transaction, is_refund=is_refund
        )
        contribution.refresh_from_db()
        assert contribution.payment_set.count() == 1
        assert payment.contribution == contribution
        assert payment.stripe_balance_transaction_id == balance_transaction.id
        assert payment.net_amount_paid == (balance_transaction.net if not is_refund else 0)
        assert payment.gross_amount_paid == (balance_transaction.amount if not is_refund else 0)
        assert payment.amount_refunded == (balance_transaction.amount if is_refund else 0)
        assert payment.transaction_time
        assert action == ("updated" if payment_exists else "created")

    def test_when_transaction_is_none(self, contribution, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mock_upsert = mocker.patch("apps.common.utils.upsert_with_diff_check")
        payment, action = upsert_payment_for_transaction(contribution=contribution, transaction=None)
        logger_spy.assert_called_once()
        mock_upsert.assert_not_called()
        assert payment is None
        assert action is None


@pytest.mark.django_db
class TestSubscriptionForRecurringContribution:

    @pytest.mark.parametrize("has_referer", (True, False))
    def test_init_when_referer_not_validate(self, subscription, customer, has_referer):
        subscription.metadata["referer"] = "https://example.com" if has_referer else None

        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        assert "referer" in str(exc_info.value)

    def test_init_when_customer_not_validate(self, subscription):
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=None)
        assert str(exc_info.value) == f"Subscription {subscription.id} has no customer associated with it"

    def test_init_when_email_id_not_validate(self, subscription, customer):
        customer.email = None
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        assert str(exc_info.value) == f"Subscription {subscription.id} has no email associated with it"

    def test_init_when_metadata_not_validate(self, subscription, customer, mock_metadata_validator):
        mock_metadata_validator.side_effect = InvalidMetadataError("foo")
        with pytest.raises(InvalidMetadataError):
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        mock_metadata_validator.assert_called_once_with(subscription.metadata)

    def test_init_when_metadata_not_supported_version(self, subscription, customer):
        subscription.metadata["schema_version"] = "unsupported"
        with pytest.raises(InvalidMetadataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        assert "Invalid schema version unsupported for Subscription" in str(exc_info.value)

    def test_init_when_subscription_interval_not_validate(self, subscription, customer):
        subscription.plan.interval = "unexpected"
        with pytest.raises(InvalidIntervalError):
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)

    def test__str__(self, subscription, customer):
        subscription.id = "sub_1"
        assert (
            str(
                SubscriptionForRecurringContribution(
                    subscription=subscription, charges=[], refunds=[], customer=customer
                )
            )
            == f"SubscriptionForRecurringContribution {subscription.id}"
        )

    @pytest.mark.parametrize("referer_has_slug", (True, False))
    def test_donation_page_property_happy_path(self, referer_has_slug, subscription, customer, domain_apex):
        page = DonationPageFactory()
        page.revenue_program.default_donation_page = page
        page.revenue_program.save()
        subscription.metadata["revenue_program_id"] = str(page.revenue_program.id)
        assert page.slug
        referer = f"https://{domain_apex}/{(page.slug + '/') if referer_has_slug else ''}"
        subscription.metadata["referer"] = referer
        assert (
            SubscriptionForRecurringContribution(
                subscription=subscription, customer=customer, charges=[], refunds=[]
            ).donation_page
            == page
        )

    def test_donation_page_property_when_metadata_rp_id_is_empty_string(self, subscription, customer):
        subscription.metadata["revenue_program_id"] = ""
        assert (
            SubscriptionForRecurringContribution(
                subscription=subscription, customer=customer, charges=[], refunds=[]
            ).donation_page
            is None
        )

    def test_donation_page_property_when_rp_is_not_found(self, subscription, customer):
        subscription.metadata["revenue_program_id"] = "3737"
        assert not RevenueProgram.objects.filter(id=3737).exists()
        assert (
            SubscriptionForRecurringContribution(
                subscription=subscription, customer=customer, charges=[], refunds=[]
            ).donation_page
            is None
        )

    @pytest.mark.parametrize(
        "sub_status,con_status",
        (
            ("active", ContributionStatus.PAID),
            ("past_due", ContributionStatus.PAID),
            ("incomplete_expired", ContributionStatus.FAILED),
            ("canceled", ContributionStatus.CANCELED),
            ("anything_else_that_arrives", ContributionStatus.PROCESSING),
        ),
    )
    def test_status(self, subscription, sub_status, con_status, customer):
        subscription.status = sub_status
        assert (
            SubscriptionForRecurringContribution(
                subscription=subscription, charges=[], refunds=[], customer=customer
            ).status
            == con_status
        )

    @pytest.mark.parametrize(
        "plan_interval,plan_interval_count,expected",
        (
            ("year", 1, ContributionInterval.YEARLY),
            ("month", 1, ContributionInterval.MONTHLY),
            ("unexpected", 1, None),
            ("year", 2, None),
            ("month", 2, None),
        ),
    )
    def test_get_interval_from_subscription(self, subscription, plan_interval, plan_interval_count, expected):
        subscription.plan.interval = plan_interval
        subscription.plan.interval_count = plan_interval_count
        if expected is not None:
            assert SubscriptionForRecurringContribution.get_interval_from_subscription(subscription) == expected
        else:
            with pytest.raises(InvalidIntervalError):
                SubscriptionForRecurringContribution.get_interval_from_subscription(subscription)

    @pytest.fixture(
        params=[
            {"subscription_default_pm": None, "customer": "customer_no_invoice_settings", "expected": None},
            {
                "subscription_default_pm": None,
                "customer": "customer_with_invoice_settings",
                "expected": "payment_method_A",
            },
            {
                "subscription_default_pm": "payment_method_B",
                "customer": "customer_with_invoice_settings",
                "expected": "payment_method_B",
            },
        ]
    )
    def payment_method_state_space(self, request, subscription, customer):
        pm = (
            request.getfixturevalue(request.param["subscription_default_pm"])
            if request.param["subscription_default_pm"]
            else None
        )
        customer = request.getfixturevalue(request.param["customer"])
        subscription = deepcopy(subscription)
        subscription.default_payment_method = pm
        expected = request.getfixturevalue(request.param["expected"]) if request.param["expected"] else None
        return subscription, customer, expected

    def test_payment_method(self, payment_method_state_space):
        subscription, customer, expected = payment_method_state_space
        instance = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[], refunds=[], customer=customer
        )
        assert instance.payment_method == expected

    @pytest.fixture(params=["subscription", "subscription_with_existing_nre_entities"])
    def subscription_to_upsert(self, request, domain_apex):
        page = DonationPageFactory()
        page.revenue_program.default_donation_page = page
        page.revenue_program.save()
        subscription = request.getfixturevalue(request.param)
        subscription.metadata["revenue_program_id"] = str(page.revenue_program.id)
        subscription.metadata["referer"] = f"https://{domain_apex}/{page.slug}/"
        return subscription, (True if request.param == "subscription_with_existing_nre_entities" else False)

    def test_upsert(self, subscription_to_upsert, charge, refund, customer, mocker):
        subscription, existing_entities = subscription_to_upsert
        if existing_entities:
            orig_metadata = Contribution.objects.get(
                provider_subscription_id=subscription.id
            ).contribution_metadata.copy()
        mock_upsert_payment = mocker.patch(
            "apps.contributions.stripe_import.upsert_payment_for_transaction", return_value=(None, None)
        )
        handler = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[charge], refunds=[refund], customer=customer
        )
        handler.upsert()

        contribution = Contribution.objects.get(provider_subscription_id=subscription.id)
        assert contribution.provider_subscription_id == subscription.id
        assert contribution.amount == subscription.plan.amount
        assert contribution.currency == subscription.plan.currency.upper()
        assert contribution.interval == ContributionInterval.MONTHLY
        assert contribution.payment_provider_used == PaymentProvider.STRIPE_LABEL
        assert contribution.provider_customer_id == subscription.customer.id
        assert contribution.provider_payment_method_id == subscription.default_payment_method.id
        assert contribution.provider_payment_method_details == subscription.default_payment_method.to_dict()
        assert contribution.contributor.email == subscription.customer.email

        if existing_entities:
            # If the upsert is updating an existing contribution, it shouldn't touch
            # its metadata.
            assert contribution.contribution_metadata == orig_metadata
            assert len(handler.created_contribution_ids) == 0
            assert len(handler.updated_contribution_ids) == 1
        else:
            assert contribution.contribution_metadata == subscription.metadata
            assert len(handler.created_contribution_ids) == 1
            assert len(handler.updated_contribution_ids) == 0

        assert contribution.status == ContributionStatus.PAID
        assert Contributor.objects.filter(email=customer.email).exists

        mock_upsert_payment.assert_any_call(contribution, charge.balance_transaction, is_refund=False)
        mock_upsert_payment.assert_any_call(contribution, refund.balance_transaction, is_refund=True)

    def test_upsert_when_no_donation_page(self, subscription, customer, charge, refund, mocker):
        mocker.patch(
            "apps.contributions.stripe_import.SubscriptionForRecurringContribution.donation_page",
            new_callable=mocker.PropertyMock,
            return_value=None,
        )
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(
                subscription=subscription, charges=[charge], customer=customer, refunds=[refund]
            ).upsert()
        assert "has no donation page associated with it" in str(exc_info.value)
        assert not Contribution.objects.filter(provider_subscription_id=subscription.id).exists()

    def test_conditionally_update_contribution_donation_page_normal_path(
        self, subscription_with_existing_nre_entities, customer, mocker
    ):
        page = DonationPageFactory()
        mocker.patch(
            "apps.contributions.stripe_import.SubscriptionForRecurringContribution.donation_page",
            new_callable=mocker.PropertyMock,
            return_value=page,
        )
        contribution = Contribution.objects.get(provider_subscription_id=subscription_with_existing_nre_entities.id)
        contribution.donation_page = None
        contribution.save()
        contribution = SubscriptionForRecurringContribution(
            subscription=subscription_with_existing_nre_entities, charges=[], refunds=[], customer=customer
        ).conditionally_update_contribution_donation_page(contribution)
        assert contribution.donation_page == page

    def test_conditionally_update_contribution_donation_page_when_donation_page_is_already_set(
        self, subscription_with_existing_nre_entities, customer, mocker
    ):
        page = DonationPageFactory()
        contribution = Contribution.objects.get(provider_subscription_id=subscription_with_existing_nre_entities.id)
        contribution.donation_page = page
        contribution.save()
        contribution = SubscriptionForRecurringContribution(
            subscription=subscription_with_existing_nre_entities, charges=[], refunds=[], customer=customer
        ).conditionally_update_contribution_donation_page(contribution)
        assert contribution.donation_page == page

    def test_conditionally_update_contribution_donation_page_when_no_donation_page(
        self, subscription_with_existing_nre_entities, customer, mocker
    ):
        mocker.patch(
            "apps.contributions.stripe_import.SubscriptionForRecurringContribution.donation_page",
            new_callable=mocker.PropertyMock,
            return_value=None,
        )
        contribution = SubscriptionForRecurringContribution(
            subscription=subscription_with_existing_nre_entities, charges=[], refunds=[], customer=customer
        ).conditionally_update_contribution_donation_page(ContributionFactory(donation_page=None))
        assert contribution.donation_page is None

    @pytest.mark.parametrize("action", ("created", "updated", "other"))
    def test_update_contribution_stats(self, action, subscription, customer):
        # NB: This method is defined in base class for SubscriptionForRecurringContribution but its behavior is invariant
        # between SubscriptionForRecurringContribution and PaymentIntentForOneTimeContribution. We only test it in one place, here.
        contribution = ContributionFactory()
        handler = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[], refunds=[], customer=customer
        )
        handler.update_contribution_stats(action, contribution)

    @pytest.mark.parametrize("action", ("created", "updated", "other"))
    def test_upsert_payments(self, subscription, customer, charge, refund, mocker, action):
        # NB: This method is defined in base class for SubscriptionForRecurringContribution but its behavior is invariant
        # between SubscriptionForRecurringContribution and PaymentIntentForOneTimeContribution. We only test it in one place, here.
        mocker.patch(
            "apps.contributions.stripe_import.upsert_payment_for_transaction", return_value=(mocker.Mock(), action)
        )
        handler = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[], refunds=[], customer=customer
        )
        handler.upsert_payments(charges=[charge], refunds=[refund], contribution=mocker.Mock())

    @pytest.mark.parametrize("contributor_exists", (True, False))
    def test_get_or_create_contributor(self, subscription, customer, contributor_exists):
        # NB: This method is defined in base class for SubscriptionForRecurringContribution but its behavior is invariant
        # between SubscriptionForRecurringContribution and PaymentIntentForOneTimeContribution. We only test it in one place, here.
        if contributor_exists:
            Contributor.objects.create(email=customer.email)
        handler = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[], refunds=[], customer=customer
        )
        assert handler.get_or_create_contributor().email == customer.email


@pytest.mark.django_db
class TestPaymentIntentForOneTimeContribution:

    @pytest.mark.parametrize("has_referer", (True, False))
    def test_init_when_referer_not_validate(self, has_referer, payment_intent, customer):
        payment_intent.metadata["referer"] = "https://example.com" if has_referer else None
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, charges=[], refunds=[], customer=customer
            )
        assert "referer" in str(exc_info.value)

    def test_init_when_no_customer(self, payment_intent):
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charges=[], refunds=[], customer=None)
        assert str(exc_info.value) == f"Payment intent {payment_intent.id} has no customer associated with it"

    def test_init_when_metadata_not_validate(self, mock_metadata_validator, payment_intent, customer):
        mock_metadata_validator.side_effect = InvalidMetadataError((msg := "foo"))
        with pytest.raises(InvalidMetadataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, charges=[], refunds=[], customer=customer
            )
        assert str(exc_info.value) == msg

    def test_init_when_metadata_not_supported_version(self, payment_intent, customer):
        payment_intent.metadata["schema_version"] = "unsupported"
        with pytest.raises(InvalidMetadataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, charges=[], refunds=[], customer=customer
            )
        assert "Invalid schema version unsupported for Payment intent" in str(exc_info.value)

    def test_init_when_no_email_id(self, payment_intent, customer):
        customer.email = None
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, refunds=[], charges=[], customer=customer
            )
        assert str(exc_info.value) == f"Payment intent {payment_intent.id} has no email associated with it"

    def test_init_when_charges_not_validate(self, payment_intent, customer, charge):
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, refunds=[], charges=[charge, charge], customer=customer
            )
        assert (
            str(exc_info.value)
            == f"Payment intent {payment_intent.id} has multiple successful charges associated with it. Unable to create one-time contribution"
        )

    @pytest.mark.parametrize(
        "refunded,pi_status,expected",
        (
            (True, "anything", ContributionStatus.REFUNDED),
            (False, "succeeded", ContributionStatus.PAID),
            (False, "canceled", ContributionStatus.CANCELED),
            (False, "processing", ContributionStatus.PROCESSING),
            (False, "requires_action", ContributionStatus.PROCESSING),
            (False, "requires_capture", ContributionStatus.PROCESSING),
            (False, "requires_confirmation", ContributionStatus.PROCESSING),
            (False, "requires_payment_method", ContributionStatus.PROCESSING),
        ),
    )
    def test_status_when_expected_status(self, refunded, pi_status, expected, payment_intent, mocker, customer):
        mocker.patch("apps.contributions.stripe_import.PaymentIntentForOneTimeContribution.refunded", refunded)
        payment_intent.status = pi_status
        instance = PaymentIntentForOneTimeContribution(
            payment_intent=payment_intent, charges=[], customer=customer, refunds=[]
        )
        assert instance.status == expected

    def test_status_when_unexpected_status(self, payment_intent, customer):
        payment_intent.status = "unexpected"
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, charges=[], customer=customer, refunds=[]
            ).status
        assert str(exc_info.value) == "Unknown status for payment intent"

    @pytest.fixture(
        params=[
            {"pi_payment_method": None, "customer": "customer_no_invoice_settings", "expected": None},
            {
                "pi_payment_method": None,
                "customer": "customer_with_invoice_settings",
                "expected": "payment_method_A",
            },
            {
                "pi_payment_method": "payment_method_B",
                "customer": "customer_with_invoice_settings",
                "expected": "payment_method_B",
            },
        ]
    )
    def payment_method_state_space(self, request, payment_intent, customer):
        pi_pm = (
            request.getfixturevalue(request.param["pi_payment_method"]) if request.param["pi_payment_method"] else None
        )
        customer = request.getfixturevalue(request.param["customer"])
        pi = deepcopy(payment_intent)
        pi.payment_method = pi_pm
        expected = request.getfixturevalue(request.param["expected"]) if request.param["expected"] else None
        return pi, customer, expected

    def test_payment_method(self, payment_method_state_space):
        pi, customer, expected = payment_method_state_space
        instance = PaymentIntentForOneTimeContribution(payment_intent=pi, charges=[], refunds=[], customer=customer)
        assert instance.payment_method == expected

    @pytest.fixture
    def payment_intent_with_existing_nre_entities(self, payment_intent):
        ContributionFactory(provider_payment_id=payment_intent.id)
        return payment_intent

    def test__str__(self, payment_intent, customer):
        assert (
            str(
                PaymentIntentForOneTimeContribution(
                    payment_intent=payment_intent, customer=customer, charges=[], refunds=[]
                )
            )
            == f"PaymentIntentForOneTimeContribution {payment_intent.id}"
        )

    @pytest.fixture(params=["payment_intent", "payment_intent_with_existing_nre_entities"])
    def pi_to_upsert(self, request, domain_apex):
        page = DonationPageFactory()
        page.revenue_program.default_donation_page = page
        page.revenue_program.save()
        pi = request.getfixturevalue(request.param)
        pi.metadata["revenue_program_id"] = str(page.revenue_program.id)
        pi.metadata["referer"] = f"https://{domain_apex}/{page.slug}/"
        return pi, (True if request.param == "payment_intent_with_existing_nre_entities" else False)

    def test_upsert(self, pi_to_upsert, customer, charge, refund, mocker):
        payment_intent, existing_entities = pi_to_upsert
        if existing_entities:
            orig_metadata = Contribution.objects.get(provider_payment_id=payment_intent.id).contribution_metadata.copy()
        mock_upsert_payment = mocker.patch(
            "apps.contributions.stripe_import.upsert_payment_for_transaction", return_value=(None, None)
        )
        handler = PaymentIntentForOneTimeContribution(
            payment_intent=payment_intent, charges=[charge], customer=customer, refunds=[refund]
        )
        handler.upsert()
        contribution = Contribution.objects.get(provider_payment_id=payment_intent.id)
        assert contribution.provider_payment_id == payment_intent.id
        assert contribution.amount == payment_intent.amount
        assert contribution.currency == payment_intent.currency.upper()
        assert contribution.interval == ContributionInterval.ONE_TIME
        assert contribution.payment_provider_used == PaymentProvider.STRIPE_LABEL
        assert contribution.provider_payment_method_id == payment_intent.payment_method.id
        assert contribution.provider_payment_method_details == payment_intent.payment_method.to_dict()
        assert contribution.contributor.email == customer.email

        if existing_entities:
            # If the upsert is updating an existing contribution, it shouldn't touch
            # its metadata.
            assert contribution.contribution_metadata == orig_metadata
            assert len(handler.created_contribution_ids) == 0
            assert len(handler.updated_contribution_ids) == 1

        else:
            assert contribution.contribution_metadata == payment_intent.metadata
            assert len(handler.created_contribution_ids) == 1
            assert len(handler.updated_contribution_ids) == 0

        # because we send a refund, the status is refunded
        assert contribution.status == ContributionStatus.REFUNDED
        assert contribution.provider_customer_id == customer.id
        assert Contributor.objects.filter(email=customer.email).exists
        mock_upsert_payment.assert_any_call(contribution, charge.balance_transaction, is_refund=False)
        mock_upsert_payment.assert_any_call(contribution, refund.balance_transaction, is_refund=True)

    def test_upsert_when_no_donation_page(self, payment_intent, customer, charge, refund, mocker):
        mocker.patch(
            "apps.contributions.stripe_import.PaymentIntentForOneTimeContribution.donation_page",
            new_callable=mocker.PropertyMock,
            return_value=None,
        )
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            PaymentIntentForOneTimeContribution(
                payment_intent=payment_intent, charges=[charge], customer=customer, refunds=[refund]
            ).upsert()
        assert "has no donation page associated with it" in str(exc_info.value)
        assert not Contribution.objects.filter(provider_payment_id=payment_intent.id).exists()


@pytest.mark.django_db
class TestStripeTransactionsImporter:

    def test_created_query(self, mocker):
        from_date = mocker.Mock()
        to_date = mocker.Mock()
        assert StripeTransactionsImporter(
            stripe_account_id="foo", from_date=from_date, to_date=to_date
        ).created_query == {"gte": from_date, "lte": to_date}

    def test_get_charges_for_payment_intent(self, mocker):
        mock_charge_list = mocker.patch("stripe.Charge.list")
        mock_charge_list.return_value.auto_paging_iter.return_value = (results := ["foo", "bar"])
        instance = StripeTransactionsImporter(stripe_account_id=(stripe_id := "test"))
        assert instance.get_charges_for_payment_intent(payment_intent_id=(pi_id := "pi_id")) == results
        mock_charge_list.assert_called_once_with(
            payment_intent=pi_id,
            stripe_account=stripe_id,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            expand=("data.balance_transaction", "data.refunds.data.balance_transaction"),
        )

    def test_get_payment_intents(self, mocker):
        mock_pi_list = mocker.patch("stripe.PaymentIntent.list")
        mock_pi_list.return_value.auto_paging_iter.return_value = (results := [mocker.Mock(), mocker.Mock()])
        instance = StripeTransactionsImporter(stripe_account_id=(stripe_id := "test"))
        assert instance.get_payment_intents() == results
        mock_pi_list.assert_called_once_with(
            created=instance.created_query,
            stripe_account=stripe_id,
            limit=MAX_STRIPE_RESPONSE_LIMIT,
        )

    @pytest.fixture(
        params=[
            {"pi_invoice": None, "invoice": None, "expected": True},
            {"pi_invoice": "invoice_without_subscription", "invoice": "invoice_with_subscription", "expected": False},
            {"pi_invoice": "invoice_without_subscription", "invoice": None, "expected": True},
        ]
    )
    def is_for_one_time_test_case(self, request, payment_intent):
        pi = deepcopy(payment_intent)
        pi.invoice = request.getfixturevalue(request.param["pi_invoice"]) if request.param["pi_invoice"] else None
        invoice = request.getfixturevalue(request.param["invoice"]) if request.param["invoice"] else None
        expected = request.param["expected"]
        return pi, invoice, expected

    def test_is_for_one_time_contribution(self, is_for_one_time_test_case):
        pi, invoice, expected = is_for_one_time_test_case
        instance = StripeTransactionsImporter(stripe_account_id="test")
        assert instance.is_for_one_time_contribution(pi, invoice) == expected

    @pytest.mark.parametrize("has_error", (True, False))
    def test_get_stripe_entity(self, has_error, mocker):
        instance = StripeTransactionsImporter(stripe_account_id=(stripe_id := "test"))
        mock_stripe_get_payment_intent = mocker.patch("stripe.PaymentIntent.retrieve")
        if has_error:
            mock_stripe_get_payment_intent.side_effect = stripe.error.StripeError("foo", "id", "foo")
        kwargs = {
            "entity_id": "foo",
            "entity_name": "PaymentIntent",
            "expand": ("foo", "bar"),
        }
        instance.get_stripe_entity(**kwargs)
        mock_stripe_get_payment_intent.assert_called_once_with(
            kwargs["entity_id"], stripe_account=stripe_id, expand=kwargs["expand"]
        )

    @pytest.mark.parametrize(
        "method_name,entity_name,expand_fields",
        (
            ("get_payment_method", "PaymentMethod", None),
            ("get_stripe_customer", "Customer", ("invoice_settings.default_payment_method",)),
            ("get_invoice", "Invoice", ("subscription.default_payment_method",)),
            ("get_payment_intent", "PaymentIntent", ("payment_method",)),
        ),
    )
    def test_get_stripe_entity_methods(self, method_name, entity_name, expand_fields, mocker):
        mock_get_stripe_entity = mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_stripe_entity"
        )
        instance = StripeTransactionsImporter(stripe_account_id="test")
        getattr(instance, method_name)((id := "foo"))
        expected_kwargs = {"entity_id": id, "entity_name": entity_name}
        if expand_fields:
            expected_kwargs["expand"] = expand_fields
        mock_get_stripe_entity.assert_called_once_with(**expected_kwargs)

    @pytest.mark.parametrize("invoice", ["invoice_with_subscription", "invoice_without_subscription"])
    def test_assemble_data_for_pi(self, payment_intent, mocker, customer, invoice, request, charge_with_refund):
        invoice = request.getfixturevalue(invoice)
        # We want this to be a generator, as that is what original method returns and there was a bug caused by treating it like
        # a list in DEV-4644
        charges = (x for x in [charge_with_refund])
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_charges_for_payment_intent",
            return_value=charges,
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_stripe_customer",
            return_value=customer,
        )
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_invoice",
            return_value=invoice,
        )
        payment_intent.invoice = invoice
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_payment_intent",
            return_value=payment_intent,
        )
        instance = StripeTransactionsImporter(stripe_account_id="test")
        data = instance.assemble_data_for_pi(payment_intent)
        assert data.get("payment_intent", data.get("subscription"))
        assert data["charges"] == [charge_with_refund]
        assert data["refunds"] == [charge_with_refund.refunds.data[0]]
        assert data["customer"] == customer

    @pytest.fixture
    def charge_with_refund(self, mocker, charge, refund):
        charge = deepcopy(charge)
        charge.refunded = True
        charge.amount_refunded = 1000
        charge.refunds = mocker.Mock(total_count=1, data=[refund])
        return charge

    @pytest.fixture
    def invoice_with_subscription(self, mocker):
        return mocker.Mock(subscription="sub_1", id="inv_1")

    @pytest.fixture
    def invoice_without_subscription(self, mocker):
        return mocker.Mock(subscription=None)

    @pytest.fixture
    def retrieved_payment_intents(self, payment_intent, payment_intent_for_recurring_contribution):
        return [payment_intent, payment_intent_for_recurring_contribution]

    @pytest.mark.parametrize("has_upsert_error", (True, False))
    def test_import_contributions_and_payments(
        self, mocker, has_upsert_error, retrieved_payment_intents, subscription, customer
    ):
        # this test is minimal just so code is covered. we don't even assert about anything
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.get_payment_intents",
            side_effect=[retrieved_payment_intents],
        )
        _shared = {"charges": [], "refunds": [], "customer": customer}
        mocker.patch(
            "apps.contributions.stripe_import.StripeTransactionsImporter.assemble_data_for_pi",
            side_effect=[
                {"payment_intent": retrieved_payment_intents[0]} | _shared,
                {"subscription": subscription} | _shared,
            ],
        )
        if has_upsert_error:
            mocker.patch(
                "apps.contributions.stripe_import.StripeTransactionsImporter.upsert_transaction",
                side_effect=InvalidStripeTransactionDataError("foo"),
            )
        StripeTransactionsImporter(stripe_account_id="test").import_contributions_and_payments()

    @pytest.fixture
    def subscription_upsert_data(self, subscription, customer):
        return {"subscription": subscription, "charges": [], "refunds": [], "customer": customer}

    @pytest.fixture
    def pi_upsert_data(self, payment_intent, customer):
        return {"payment_intent": payment_intent, "charges": [], "refunds": [], "customer": customer}

    @pytest.mark.parametrize("data", ["subscription_upsert_data", "pi_upsert_data"])
    def test_upsert_transaction(self, data, request):
        """Minimal test to cover the code"""
        instance = StripeTransactionsImporter(stripe_account_id="test")
        instance.upsert_transaction(request.getfixturevalue(data))


class TestStripeEventProcessor:
    @pytest.fixture
    def supported_event(self):
        event_type = settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS[0]
        return stripe.Event.construct_from(
            {
                "id": "evt_1",
                "type": event_type,
            },
            key="test",
        )

    @pytest.fixture
    def unsupported_event(self):
        unsupported_event_type = "unsupported_event"
        assert unsupported_event_type not in settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS
        return stripe.Event.construct_from(
            {
                "id": "evt_1",
                "type": unsupported_event_type,
            },
            key="test",
        )

    @pytest.mark.parametrize("async_mode", (True, False))
    def test_sync_happy_path(self, async_mode, supported_event, mocker):
        mock_retrieve_event = mocker.patch("stripe.Event.retrieve", return_value=supported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        processor = StripeEventProcessor(
            stripe_account_id=(stripe_account := "test"), event_id=(event_id := "evt_1"), async_mode=async_mode
        )
        processor.process()
        if async_mode:
            mock_process_webhook.assert_not_called()
            mock_process_webhook.delay.assert_called_once_with(raw_event_data=supported_event)
        else:
            mock_process_webhook.assert_called_once_with(raw_event_data=supported_event)
            mock_process_webhook.delay.assert_not_called()
        mock_retrieve_event.assert_called_once_with(id=event_id, stripe_account=stripe_account)

    def test_when_event_not_supported(self, unsupported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mocker.patch("stripe.Event.retrieve", return_value=unsupported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        StripeEventProcessor(stripe_account_id="test", event_id="evt_1", async_mode=False).process()
        logger_spy.assert_called_once_with("Event type %s is not supported", unsupported_event.type)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()

    def test_when_event_not_found(self, supported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mocker.patch("stripe.Event.retrieve", side_effect=stripe.error.StripeError("not found", "id", "evt_1"))
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        StripeEventProcessor(stripe_account_id="test", event_id="evt_1", async_mode=False).process()
        assert logger_spy.call_args == mocker.call("No event found for event id %s", supported_event.id)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()
