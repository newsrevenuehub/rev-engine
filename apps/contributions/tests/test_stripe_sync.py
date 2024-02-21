import datetime
from copy import deepcopy

from django.conf import settings

import pytest
import stripe

from apps.contributions.models import ContributionInterval, ContributionStatus, Payment
from apps.contributions.stripe_sync import (
    MAX_STRIPE_RESPONSE_LIMIT,
    InvalidIntervalError,
    InvalidMetadataError,
    StripeClientForConnectedAccount,
    StripeEventSyncer,
    StripeToRevengineTransformer,
    UntrackedOneTimePaymentIntent,
    UntrackedStripeSubscription,
    _upsert_payments_for_charge,
)
from apps.contributions.tests.factories import ContributionFactory, PaymentFactory
from apps.contributions.types import StripePaymentMetadataSchemaV1_4
from apps.organizations.models import PaymentProvider
from apps.organizations.tests.factories import PaymentProviderFactory


@pytest.fixture
def balance_transaction(mocker):
    return mocker.Mock(
        id="bt_1",
        net=1000,
        amount=1000,
        created=datetime.datetime.now().timestamp(),
    )


@pytest.fixture
def refund(mocker):
    balance_transaction = mocker.Mock(
        id="bt_2",
        net=0,
        amount=0,
        created=datetime.datetime.now().timestamp(),
    )
    refund = mocker.Mock(amount=1000, balance_transaction=balance_transaction)
    return refund


@pytest.fixture
def payment_intent(mocker, charge, valid_metadata):
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
        # this implies it's a one time charge
        invoice=None,
    )


@pytest.fixture
def pi_without_invoice(mocker):
    return mocker.Mock(invoice=None)


@pytest.fixture
def pi_with_invoice(mocker):
    return mocker.Mock(invoice="inv_1")


@pytest.fixture
def invoice_with_subscription(mocker):
    return mocker.Mock(subscription="sub_1")


@pytest.fixture
def invoice_without_subscription(mocker):
    return mocker.Mock(subscription=None)


@pytest.fixture
def mock_metadata_validator(mocker):
    return mocker.patch("apps.contributions.stripe_sync.cast_metadata_to_stripe_payment_metadata_schema")


@pytest.fixture
def valid_metadata():
    return StripePaymentMetadataSchemaV1_4(
        agreed_to_pay_fees=False,
        donor_selected_amount=1000.0,
        referer="https://www.google.com/",
        revenue_program_id=1,
        revenue_program_slug="testrp",
        schema_version="1.4",
        source="rev-engine",
    ).model_dump(mode="json", exclude_none=True)


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
    )


@pytest.fixture
def charge_with_refund(mocker, charge, refund):
    charge = deepcopy(charge)
    charge.refunded = True
    charge.amount_refunded = 1000
    charge.refunds = mocker.Mock(total_count=1, data=[refund])
    return charge


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
def customer_with_default_pm(customer, payment_method_A, mocker):
    customer = deepcopy(customer)
    customer.invoice_settings = mocker.Mock(default_payment_method=payment_method_A)
    return customer


@pytest.mark.django_db
class Test__upsert_payments_for_charge:
    @pytest.fixture
    def contribution(self):
        return ContributionFactory()

    @pytest.fixture(params=["charge", "charge_with_refund"])
    def charge(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize("payments_exist", (True, False))
    def test_happy_path(self, payments_exist, contribution, balance_transaction, charge, refund, mocker):
        existing = 0
        if payments_exist:
            PaymentFactory(
                contribution=contribution,
                stripe_balance_transaction_id=balance_transaction.id,
            )
            existing += 1
            if charge.refunded:
                PaymentFactory(
                    contribution=contribution,
                    stripe_balance_transaction_id=refund.balance_transaction.id,
                )
                existing += 1
        _upsert_payments_for_charge(contribution=contribution, charge=charge, balance_transaction=balance_transaction)
        refund = charge.refunds.data[0] if charge.refunded else None
        contribution.refresh_from_db()
        if payments_exist:
            assert contribution.payment_set.count() == existing
        else:
            assert contribution.payment_set.count() == 1 + (1 if charge.refunded else 0)

        assert Payment.objects.filter(
            contribution=contribution,
            stripe_balance_transaction_id=balance_transaction.id,
            net_amount_paid=balance_transaction.net,
            gross_amount_paid=balance_transaction.amount,
            amount_refunded=0,
            transaction_time__isnull=False,
        ).exists()
        if charge.refunded:
            assert Payment.objects.filter(
                contribution=contribution,
                stripe_balance_transaction_id=refund.balance_transaction.id,
                net_amount_paid=0,
                gross_amount_paid=0,
                amount_refunded=refund.amount,
                transaction_time__isnull=False,
            ).exists()


@pytest.mark.django_db
class TestUntrackedStripeSubscription:
    @pytest.mark.parametrize("metadata_validates", (True, False))
    def test_init_with_regard_to_metadata_validity(
        self, metadata_validates, mock_metadata_validator, subscription, mocker
    ):
        if not metadata_validates:
            mock_metadata_validator.side_effect = ValueError("foo")
            with pytest.raises(InvalidMetadataError):
                UntrackedStripeSubscription(subscription=subscription, charges=[])
        else:
            instance = UntrackedStripeSubscription(subscription=subscription, charges=[])
            assert instance.subscription == subscription
            assert instance.charges == []

        mock_metadata_validator.assert_called_once_with(subscription.metadata)

    def test__str__(self, subscription, mock_metadata_validator):
        subscription.id = "sub_1"
        assert (
            str(UntrackedStripeSubscription(subscription=subscription, charges=[]))
            == f"UntrackedStripeSubscription {subscription.id}"
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
    def test_status(self, subscription, sub_status, con_status, mock_metadata_validator):
        subscription.status = sub_status
        assert UntrackedStripeSubscription(subscription=subscription, charges=[]).status == con_status

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
    def test_interval(self, subscription, plan_interval, plan_interval_count, expected):
        subscription.plan.interval = plan_interval
        subscription.plan.interval_count = plan_interval_count
        if expected is not None:
            assert UntrackedStripeSubscription.get_interval_from_subscription(subscription) == expected
        else:
            with pytest.raises(InvalidIntervalError):
                UntrackedStripeSubscription.get_interval_from_subscription(subscription)

    @pytest.mark.parametrize("customer_exists", (True, False))
    def test_email_id(self, customer_exists, subscription, mocker, mock_metadata_validator):
        if customer_exists:
            subscription.customer = mocker.Mock(email=(email := "foo@bar.com"))
        else:
            subscription.customer = None
        instance = UntrackedStripeSubscription(subscription=subscription, charges=[])
        if customer_exists:
            assert instance.email_id == email
        else:
            assert instance.email_id is None

    # subscription default pm => pm
    # no sub default pm, but customer and customer.invoice settings pm = customer.invoicessettings.default_payment_method as retrieved
    # no sub default pm, but customer, no customer.invoice settings pm = None
    # no sub default pm, no customer = None

    @pytest.fixture(
        params=[
            {"subscription_default_pm": None, "subscription_customer": None, "expected": None},
            {
                "subscription_default_pm": None,
                "subscription_customer": "customer_with_default_pm",
                "expected": "payment_method_A",
            },
            {
                "subscription_default_pm": "payment_method_B",
                "subscription_customer": None,
                "expected": "payment_method_B",
            },
        ]
    )
    def payment_method_state_space(self, mocker, request, subscription):
        pm = (
            request.getfixturevalue(request.param["subscription_default_pm"])
            if request.param["subscription_default_pm"]
            else None
        )
        customer = (
            request.getfixturevalue(request.param["subscription_customer"])
            if request.param["subscription_customer"]
            else None
        )
        if customer:
            mocker.patch("stripe.Customer.retrieve", return_value=customer)
        subscription = deepcopy(subscription)
        subscription.default_payment_method = pm
        subscription.customer = customer
        expected = request.getfixturevalue(request.param["expected"]) if request.param["expected"] else None
        return subscription, expected

    def test_payment_method(self, payment_method_state_space, mock_metadata_validator):
        subscription, expected = payment_method_state_space
        instance = UntrackedStripeSubscription(subscription=subscription, charges=[])
        assert instance.payment_method == expected

    @pytest.fixture(params=["subscription", "subscription_with_existing_nre_entities"])
    def subscription_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize("has_email_id", (True, False))
    def test_upsert(self, has_email_id, subscription_to_upsert, mock_metadata_validator, charge, mocker):
        mocker.patch(
            "apps.contributions.stripe_sync.UntrackedStripeSubscription.email_id",
            new_callable=mocker.PropertyMock,
            return_value="foo@bar.com" if has_email_id else None,
        )
        mock_upsert_charges = mocker.patch("apps.contributions.stripe_sync._upsert_payments_for_charge")
        instance = UntrackedStripeSubscription(subscription=subscription_to_upsert, charges=[charge])
        if has_email_id:
            contribution = instance.upsert()
            assert contribution.provider_subscription_id == subscription_to_upsert.id
            assert contribution.amount == subscription_to_upsert.plan.amount
            assert contribution.currency == subscription_to_upsert.plan.currency
            assert contribution.reason == ""
            assert contribution.interval == ContributionInterval.MONTHLY
            assert contribution.payment_provider_used == "stripe"
            assert contribution.provider_customer_id == subscription_to_upsert.customer.id
            assert contribution.provider_payment_method_id == subscription_to_upsert.default_payment_method.id
            assert (
                contribution.provider_payment_method_details == subscription_to_upsert.default_payment_method.to_dict()
            )
            assert contribution.contributor.email == subscription_to_upsert.customer.email
            assert contribution.contribution_metadata == subscription_to_upsert.metadata
            assert contribution.status == ContributionStatus.PAID
            mock_upsert_charges.assert_called_once_with(contribution, charge, charge.balance_transaction)
        else:
            with pytest.raises(ValueError):
                instance.upsert()


@pytest.mark.django_db
class TestUntrackedOneTimePaymentIntent:
    @pytest.fixture
    def payment_intent_with_existing_nre_entities(self, payment_intent):
        ContributionFactory(provider_payment_id=payment_intent.id)
        return payment_intent

    @pytest.mark.parametrize("metadata_validates", (True, False))
    def test_init_with_regard_to_metadata_validity(
        self,
        metadata_validates,
        mock_metadata_validator,
        charge,
        payment_intent,
    ):
        if not metadata_validates:
            mock_metadata_validator.side_effect = ValueError("foo")
            with pytest.raises(InvalidMetadataError):
                UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=charge)
        else:
            instance = UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=charge)
            assert instance.payment_intent == payment_intent
            assert instance.charge == charge
        mock_metadata_validator.assert_called_once_with(payment_intent.metadata)

    def test_init_when_pi_charges_gt_1(self, payment_intent, charge):
        payment_intent.charges.total_count = 2
        with pytest.raises(ValueError):
            UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=charge)

    def test__str__(self, payment_intent, mock_metadata_validator, mocker):
        payment_intent.id = "pi_1"
        assert (
            str(UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=mocker.Mock()))
            == f"UntrackedOneTimePaymentIntent {payment_intent.id}"
        )

    @pytest.fixture
    def charge_no_customer(self, charge):
        charge.customer = None
        return charge

    @pytest.fixture
    def charge_with_customer_string(self, charge, customer, mocker):
        mocker.patch("stripe.Customer.retrieve", return_value=customer)
        charge.customer = customer.id
        return charge

    @pytest.fixture
    def charge_is_none(self):
        return None

    @pytest.fixture(params=["charge", "charge_no_customer", "charge_with_customer_string", "charge_is_none"])
    def charge_value(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture
    def payment_intent_with_customer_none(self, payment_intent):
        payment_intent = deepcopy(payment_intent)
        payment_intent.customer = None
        return payment_intent

    @pytest.fixture
    def payment_intent_with_customer_string(self, payment_intent, customer, mocker):
        mocker.patch("stripe.Customer.retrieve", return_value=customer)
        payment_intent = deepcopy(payment_intent)
        payment_intent.customer = customer.id
        return payment_intent

    @pytest.fixture
    def payment_intent_with_customer_object(self, payment_intent, customer):
        payment_intent = deepcopy(payment_intent)
        payment_intent.customer = customer
        return payment_intent

    @pytest.fixture(
        params=[
            "payment_intent_with_customer_object",
            "payment_intent_with_customer_string",
            "payment_intent_with_customer_none",
        ]
    )
    def payment_intent_value(self, request):
        return request.getfixturevalue(request.param)

    def test_customer(self, charge_value, payment_intent_value, customer):
        instance = UntrackedOneTimePaymentIntent(payment_intent=payment_intent_value, charge=charge_value)
        if any(
            [
                charge_value and charge_value.customer,
                payment_intent_value.customer,
            ]
        ):
            assert instance.customer == customer
        else:
            assert instance.customer is None

    @pytest.fixture(params=[1, 2, 3])
    def refunded_test_case(self, request, payment_intent):
        match request.param:
            case 1:
                # no refunds on charge
                return payment_intent, False
            case 2:
                payment_intent.charges.data[0].refunded = True
                return payment_intent, True
            case 3:
                payment_intent.charges.data[0].amount_refunded = 1
                return payment_intent, True

    def test_refunded(self, refunded_test_case, mocker):
        payment_intent, expected_refunded = refunded_test_case
        instance = UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=mocker.Mock())
        assert instance.refunded is expected_refunded

    @pytest.mark.parametrize(
        "refunded,pi_status,expected",
        [
            (True, "anything", ContributionStatus.REFUNDED),
            (False, "succeeded", ContributionStatus.PAID),
            (False, "canceled", ContributionStatus.CANCELED),
            (False, "anything_else", ContributionStatus.PROCESSING),
        ],
    )
    def test_status(self, refunded, pi_status, expected, payment_intent, mocker):
        mocker.patch("apps.contributions.stripe_sync.UntrackedOneTimePaymentIntent.refunded", refunded)
        payment_intent.status = pi_status
        instance = UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=mocker.Mock())
        assert instance.status == expected

    @pytest.fixture
    def payment_intent_with_default_pm_object(self, payment_intent, payment_method_A):
        payment_intent = deepcopy(payment_intent)
        payment_intent.payment_method = payment_method_A
        return payment_intent

    @pytest.fixture
    def payment_intent_with_default_pm_string(self, payment_intent, payment_method_B, mocker):
        payment_intent = deepcopy(payment_intent)
        payment_intent.payment_method = "pm_B"
        mocker.patch("stripe.PaymentMethod.retrieve", return_value=payment_method_B)
        return payment_intent

    @pytest.fixture
    def payment_intent_with_no_default_pm(self, payment_intent):
        payment_intent = deepcopy(payment_intent)
        payment_intent.customer = None
        payment_intent.payment_method = None
        return payment_intent

    @pytest.fixture(
        params=[
            ("payment_intent_with_default_pm_object", None, "payment_method_A"),
            ("payment_intent_with_default_pm_string", None, "payment_method_B"),
            ("payment_intent_with_no_default_pm", None, None),
            ("payment_intent_with_no_default_pm", "customer_with_default_pm", "payment_method_A"),
            ("payment_intent_with_no_default_pm", "customer", None),
        ]
    )
    def payment_method_state_space(
        self,
        request,
        mocker,
    ):
        pi = request.getfixturevalue(request.param[0])
        customer = request.getfixturevalue(request.param[1]) if request.param[1] else None
        mocker.patch("apps.contributions.stripe_sync.UntrackedOneTimePaymentIntent.customer", customer)
        expected = request.getfixturevalue(request.param[2]) if request.param[2] else None

        return pi, customer, expected

    def test_payment_method(self, payment_method_state_space, mocker):
        pi, customer, expected = payment_method_state_space
        if customer:
            mocker.patch("stripe.Customer.retrieve", return_value=customer)
        instance = UntrackedOneTimePaymentIntent(payment_intent=pi, charge=None)
        assert instance.payment_method == expected

    @pytest.fixture(params=["payment_intent", "payment_intent_with_existing_nre_entities"])
    def pi_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    def test_upsert(self, pi_to_upsert, charge, mocker, mock_metadata_validator):
        mock_upsert_charges = mocker.patch("apps.contributions.stripe_sync._upsert_payments_for_charge")
        contribution = UntrackedOneTimePaymentIntent(payment_intent=pi_to_upsert, charge=charge).upsert()
        assert contribution.provider_payment_id == pi_to_upsert.id
        assert contribution.amount == pi_to_upsert.amount
        assert contribution.currency == pi_to_upsert.currency
        assert not contribution.reason
        assert contribution.interval == ContributionInterval.ONE_TIME
        assert contribution.payment_provider_used == "stripe"
        assert contribution.provider_customer_id == charge.customer.id
        assert contribution.provider_payment_method_id == pi_to_upsert.payment_method.id
        assert contribution.provider_payment_method_details == pi_to_upsert.payment_method.to_dict()
        assert contribution.contributor.email == charge.customer.email
        assert contribution.contribution_metadata == pi_to_upsert.metadata
        assert contribution.status == ContributionStatus.PAID
        mock_upsert_charges.assert_called_once_with(contribution, charge, charge.balance_transaction)

    def test_upsert_when_no_email_id(self, payment_intent, mocker):
        mocker.patch(
            "apps.contributions.stripe_sync.UntrackedOneTimePaymentIntent.email_id",
            new_callable=mocker.PropertyMock,
            return_value=None,
        )
        with pytest.raises(ValueError):
            UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=mocker.Mock()).upsert()


class TestStripeClientForConnectedAccount:
    @pytest.fixture(
        params=[
            {"account_id": "something"},
            {"account_id": "something", "lte": datetime.datetime.now()},
            {"account_id": "something", "gte": datetime.datetime.now()},
            {"account_id": "something", "lte": datetime.datetime.utcnow(), "gte": datetime.datetime.utcnow()},
        ]
    )
    def init_kwargs(self, request):
        return request.param

    def test_get_invoices(self, init_kwargs, mocker):
        invoice = mocker.Mock()
        mock_invoice_list = mocker.patch("stripe.Invoice.list")
        mock_invoice_list.return_value.auto_paging_iter.return_value = [invoice]
        search_result = mocker.Mock(
            data=[invoice],
            has_more=False,
            next_page=None,
        )
        mock_invoice_search = mocker.patch("stripe.Invoice.search", return_value=search_result)
        client = StripeClientForConnectedAccount(**init_kwargs)
        invoices = client.get_invoices()

        assert invoices == [invoice]

        if any([init_kwargs.get("lte"), init_kwargs.get("gte")]):
            mock_invoice_search.assert_called_once_with(
                query=mocker.ANY, limit=MAX_STRIPE_RESPONSE_LIMIT, stripe_account=init_kwargs["account_id"], page=None
            )
            mock_invoice_list.assert_not_called()
            query = mock_invoice_search.call_args[1]["query"]
            if lte := init_kwargs.get("lte"):
                assert f"created <= {lte.timestamp()}" in query
            if gte := init_kwargs.get("gte"):
                assert f"created >= {gte.timestamp()}" in query
        else:
            mock_invoice_search.assert_not_called()
            mock_invoice_list.assert_called_once_with(
                limit=MAX_STRIPE_RESPONSE_LIMIT,
                stripe_account=init_kwargs["account_id"],
            )

    @pytest.mark.parametrize("metadata_query", (None, "foo:bar"))
    def test_get_payment_intents(self, init_kwargs, metadata_query, mocker):
        pi = mocker.Mock()
        mock_pi_list = mocker.patch("stripe.PaymentIntent.list")
        mock_pi_list.return_value.auto_paging_iter.return_value = [pi]
        search_response = mocker.Mock(
            data=[pi],
            has_more=False,
            next_page=None,
        )
        mock_pi_search = mocker.patch("stripe.PaymentIntent.search", return_value=search_response)

        client = StripeClientForConnectedAccount(**init_kwargs)

        expected_query_parts = []
        if lte := init_kwargs.get("lte"):
            expected_query_parts.append(f"created <= {lte.timestamp()}")
        if gte := init_kwargs.get("gte"):
            expected_query_parts.append(f"created >= {gte.timestamp()}")
        if metadata_query:
            expected_query_parts.append(metadata_query)

        client = StripeClientForConnectedAccount(**init_kwargs)
        pis = client.get_payment_intents(metadata_query=metadata_query)
        assert pis == [pi]

        if any([lte, gte, metadata_query]):
            mock_pi_search.assert_called_once_with(
                query=mocker.ANY,
                limit=MAX_STRIPE_RESPONSE_LIMIT,
                stripe_account=init_kwargs["account_id"],
                page=None,
            )
            query = mock_pi_search.call_args[1]["query"]
            for part in expected_query_parts:
                assert part in query
            mock_pi_list.assert_not_called()
        else:
            mock_pi_search.assert_not_called()
            mock_pi_list.assert_called_once_with(
                limit=MAX_STRIPE_RESPONSE_LIMIT,
                stripe_account=init_kwargs["account_id"],
            )

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_subscription(self, raise_invalid_request_error, init_kwargs, mocker):
        client = StripeClientForConnectedAccount(**init_kwargs)
        mock_sub_retrieve = mocker.patch("stripe.Subscription.retrieve")
        if raise_invalid_request_error:
            mock_sub_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "sub_1")
        else:
            sub = mocker.Mock()
            mock_sub_retrieve.return_value = sub
        retrieved = client.get_subscription((sub_id := "sub_1"), stripe_account_id=(test_id := "test"))
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == sub
        mock_sub_retrieve.assert_called_once_with(
            sub_id,
            stripe_account=test_id,
            expand=StripeClientForConnectedAccount.DEFAULT_GET_SUBSCRIPTION_EXPAND_FIELDS,
        )

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_invoice(self, raise_invalid_request_error, init_kwargs, mocker):
        client = StripeClientForConnectedAccount(**init_kwargs)
        mock_invoice_retrieve = mocker.patch("stripe.Invoice.retrieve")
        invoice_id = "inv_1"
        if raise_invalid_request_error:
            mock_invoice_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "inv_1")
            retrieved = client.get_invoice(invoice_id, stripe_account_id=init_kwargs["account_id"])
            assert retrieved is None
        else:
            invoice = mocker.Mock()
            mock_invoice_retrieve.return_value = invoice
            retrieved = client.get_invoice(invoice_id, stripe_account_id=init_kwargs["account_id"])
            assert retrieved == invoice

        mock_invoice_retrieve.assert_called_once_with(
            invoice_id,
            stripe_account=init_kwargs["account_id"],
        )

    @pytest.fixture(
        params=[
            {"pi": "pi_without_invoice", "invoice": None, "expected": True},
            {"pi": "pi_with_invoice", "invoice": "invoice_with_subscription", "expected": False},
            {"pi": "pi_with_invoice", "invoice": "invoice_without_subscription", "expected": True},
        ]
    )
    def is_one_time_contribution_test_case(self, request):
        return (
            request.getfixturevalue(request.param["pi"]),
            request.getfixturevalue(request.param["invoice"]) if request.param["invoice"] else None,
            request.param["expected"],
        )

    def test_is_for_one_time_contribution(self, is_one_time_contribution_test_case):
        pi, invoice, expected = is_one_time_contribution_test_case
        assert StripeClientForConnectedAccount.is_for_one_time_contribution(pi=pi, invoice=invoice) == expected

    def test_get_revengine_one_time_payment_intents_and_charges(self, mocker, payment_intent):
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_payment_intents",
            return_value=[payment_intent],
        )
        client = StripeClientForConnectedAccount(account_id="test")
        result = client.get_revengine_one_time_payment_intents_and_charges()
        assert result == [{"payment_intent": payment_intent, "charge": None}]

    def test_get_revengine_subscriptions(self, invoice_with_subscription, subscription, mocker):
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_invoices",
            return_value=[invoice_with_subscription],
        )
        client = StripeClientForConnectedAccount(account_id="test")
        response = client.get_revengine_subscriptions([invoice_with_subscription])
        assert len(response) == 1
        assert response[0].id == subscription.id

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_expanded_charge_object(self, raise_invalid_request_error, charge, mocker):
        mock_retrieve = mocker.patch("stripe.Charge.retrieve")
        if raise_invalid_request_error:
            mock_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "ch_1")
        else:
            mock_retrieve.return_value = charge
        retrieved = StripeClientForConnectedAccount.get_expanded_charge_object(
            (charge_id := "charge_1"),
            stripe_account_id=(accound_id := "test"),
        )
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == charge

        mock_retrieve.assert_called_once_with(
            charge_id,
            expand=StripeClientForConnectedAccount.DEFAULT_GET_CHARGE_EXPAND_FIELDS,
            stripe_account=accound_id,
        )

    @pytest.fixture(params=[True, False])
    def subscription_metadata_validity_state_space(self, request, subscription, invalid_metadata):
        # so we test both valid and invalid metadata cases
        if request.param:
            subscription.metadata = invalid_metadata
        return subscription, request.param

    def test_get_revengine_subscriptions_data(
        self, subscription_metadata_validity_state_space, invoice_with_subscription, mocker
    ):
        subscription, has_invalid_metadata = subscription_metadata_validity_state_space
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_revengine_subscriptions",
            return_value=[subscription],
        )
        invoice_with_subscription.subscription = subscription.id

        data = StripeClientForConnectedAccount(account_id="test").get_revengine_subscriptions_data(
            invoices=[invoice_with_subscription], charges=[]
        )
        assert len(data) == 0 if has_invalid_metadata else 1
        if not has_invalid_metadata:
            assert data[0].subscription == subscription

    @pytest.fixture
    def invalid_metadata(self):
        # this would initially get through checks for schema version, but would fail when metadata schema is cast
        return {
            "schema_version": "1.4",
        }

    @pytest.fixture(params=[True, False])
    def one_time_payment_intent_metadata_validity_state_space(self, request, payment_intent, invalid_metadata):
        if request.param:
            payment_intent.metadata = invalid_metadata
        return payment_intent, request.param

    def test_get_revengine_one_time_contributions_data(
        self, one_time_payment_intent_metadata_validity_state_space, charge, mocker
    ):
        payment_intent, has_invalid_metadata = one_time_payment_intent_metadata_validity_state_space
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_revengine_one_time_payment_intents_and_charges",
            return_value=[{"payment_intent": payment_intent, "charge": charge}],
        )
        data = StripeClientForConnectedAccount(account_id="test").get_revengine_one_time_contributions_data()
        assert len(data) == 0 if has_invalid_metadata else 1
        if not has_invalid_metadata:
            assert data[0].payment_intent == payment_intent
            assert data[0].charge == charge

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_payment_method(self, raise_invalid_request_error, mocker):
        mock_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        if raise_invalid_request_error:
            mock_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "pm_1")
        else:
            mock_retrieve.return_value = (pm := mocker.Mock())
        retrieved = StripeClientForConnectedAccount.get_payment_method(
            (pm_id := "pm_1"), stripe_account_id=(stripe_account := "test")
        )
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == pm
        mock_retrieve.assert_called_once_with(
            pm_id,
            stripe_account=stripe_account,
        )

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_stripe_customer(self, raise_invalid_request_error, mocker, customer):
        mock_retrieve = mocker.patch("stripe.Customer.retrieve")
        if raise_invalid_request_error:
            mock_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "pm_1")
        else:
            mock_retrieve.return_value = (cust := customer)
        retrieved = StripeClientForConnectedAccount(account_id="test").get_stripe_customer(
            customer_id=customer.id, stripe_account_id=(account_id := "test")
        )
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == cust
        mock_retrieve.assert_called_once_with(
            customer.id,
            stripe_account=account_id,
            expand=StripeClientForConnectedAccount.DEFAULT_GET_CUSTOMER_EXPAND_FIELDS,
        )

    # @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    # def test_get_stripe_event(self):
    #     pass


@pytest.mark.django_db
class TestStripeToRevengineTransformer:
    @pytest.mark.parametrize(
        "for_orgs,for_stripe_accounts",
        (([1, 2], ["a", "b"]), ([], [])),
    )
    def test__init__(self, for_orgs, for_stripe_accounts, mocker):
        """This is here so we get test coverage through all possible paths in __post_init__"""
        StripeToRevengineTransformer(for_orgs=for_orgs, for_stripe_accounts=for_stripe_accounts)

    def test_stripe_account_ids(self):
        PaymentProviderFactory.create_batch(2)
        expected = set(
            PaymentProvider.objects.order_by("stripe_account_id")
            .values_list("stripe_account_id", flat=True)
            .distinct("stripe_account_id")
        )
        instance = StripeToRevengineTransformer()
        assert set(instance.stripe_account_ids) == expected

    def test_backfill_contributions_and_payments_for_stripe_account(self, mocker):
        mock_backfill_subs = mocker.patch(
            "apps.contributions.stripe_sync.StripeToRevengineTransformer.backfill_contributions_and_payments_for_subscriptions",
            return_value=[],
        )
        mock_backfill_one_times = mocker.patch(
            "apps.contributions.stripe_sync.StripeToRevengineTransformer.backfill_contributions_and_payments_for_payment_intents",
            return_value=[],
        )
        StripeToRevengineTransformer().backfill_contributions_and_payments_for_stripe_account((test_id := "test"))
        mock_backfill_subs.assert_called_once_with(stripe_account_id=test_id)
        mock_backfill_one_times.assert_called_once_with(stripe_account_id=test_id)

    @pytest.mark.parametrize("upsert_value_error", (True, False))
    def test_backfill_contributions_and_payments_for_subscriptions(self, upsert_value_error, mocker):
        mock_stripe_client = mocker.patch("apps.contributions.stripe_sync.StripeClientForConnectedAccount")
        mock_stripe_client.return_value.get_invoices.return_value = (
            invoices := [
                (expected := mocker.Mock(charge="ch_1")),
                mocker.Mock(charge=None),
            ]
        )
        mock_stripe_client.return_value.get_expanded_charge_object.return_value = (expanded_charge := mocker.Mock())
        mock_stripe_client.return_value.get_revengine_subscriptions_data.return_value = [
            (mock_sub_data_item := mocker.Mock()),
            mocker.Mock(),
        ]
        mock_sub_data_item.upsert.side_effect = ValueError("foo")
        contributions = StripeToRevengineTransformer().backfill_contributions_and_payments_for_subscriptions("test_id")
        mock_stripe_client.return_value.get_invoices.assert_called_once()
        mock_stripe_client.return_value.get_expanded_charge_object.assert_called_once_with(charge_id=expected.charge)
        mock_stripe_client.return_value.get_revengine_subscriptions_data.assert_called_once_with(
            invoices=invoices, charges=[expanded_charge]
        )
        assert contributions

    def test_backfill_contributions_and_payments_for_payment_intents(self, mocker):
        mock_stripe_client = mocker.patch("apps.contributions.stripe_sync.StripeClientForConnectedAccount")
        mock_stripe_client.return_value.get_revengine_one_time_contributions_data.return_value = [
            mocker.Mock(),
            (item_with_error := mocker.Mock()),
        ]
        item_with_error.upsert.side_effect = ValueError("foo")
        contributions = StripeToRevengineTransformer().backfill_contributions_and_payments_for_payment_intents(
            "test_id"
        )
        assert contributions

    def test_backfill_contributions_and_payments_from_stripe(self, mocker):
        PaymentProviderFactory()
        mock_backfill_for_stripe_account = mocker.patch(
            "apps.contributions.stripe_sync.StripeToRevengineTransformer.backfill_contributions_and_payments_for_stripe_account"
        )
        StripeToRevengineTransformer().backfill_contributions_and_payments_from_stripe()
        mock_backfill_for_stripe_account.assert_called_once()


class TestStripeEventSyncer:
    @pytest.fixture
    def supported_event(self, mocker):
        event_type = settings.STRIPE_WEBHOOK_EVENTS_CONTRIBUTIONS[0]
        return stripe.Event.construct_from(
            {
                "id": "evt_1",
                "type": event_type,
            },
            key="test",
        )

    @pytest.fixture
    def unsupported_event(self, mocker):
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
        syncer = StripeEventSyncer(
            stripe_account_id=(stripe_account := "test"), event_id=(event_id := "evt_1"), async_mode=async_mode
        )
        syncer.sync()
        if async_mode:
            mock_process_webhook.assert_not_called()
            mock_process_webhook.delay.assert_called_once_with(raw_event_data=supported_event)
        else:
            mock_process_webhook.assert_called_once_with(raw_event_data=supported_event)
            mock_process_webhook.delay.assert_not_called()
        mock_retrieve_event.assert_called_once_with(event_id, stripe_account=stripe_account)

    def test_when_event_not_supported(self, unsupported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_sync.logger.warning")
        mocker.patch("stripe.Event.retrieve", return_value=unsupported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        syncer = StripeEventSyncer(stripe_account_id="test", event_id="evt_1", async_mode=False)
        syncer.sync()
        logger_spy.assert_called_once_with("Event type %s is not supported", unsupported_event.type)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()

    def test_when_event_not_found(self, supported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_sync.logger.warning")
        mocker.patch("stripe.Event.retrieve", side_effect=stripe.error.InvalidRequestError("not found", "id", "evt_1"))
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        syncer = StripeEventSyncer(stripe_account_id="test", event_id="evt_1", async_mode=False)
        syncer.sync()
        assert logger_spy.call_args == mocker.call("No event found for event id %s", supported_event.id)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()
