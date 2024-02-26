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
from apps.contributions.models import ContributionInterval, ContributionStatus, Payment
from apps.contributions.stripe_sync import (
    MAX_STRIPE_RESPONSE_LIMIT,
    PaymentIntentForOneTimeContribution,
    StripeClientForConnectedAccount,
    StripeEventSyncer,
    StripeTransactionsSyncer,
    SubscriptionForRecurringContribution,
    upsert_payments_for_charge,
)
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
    PaymentFactory,
)
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
        # this implies it's a one time charge
        invoice=None,
        customer=customer,
    )


@pytest.fixture
def pi_without_invoice(mocker):
    return mocker.Mock(invoice=None)


@pytest.fixture
def pi_with_invoice(mocker):
    return mocker.Mock(invoice="inv_1")


@pytest.fixture
def invoice_with_subscription(mocker):
    return mocker.Mock(subscription="sub_1", id="inv_1")


@pytest.fixture
def invoice_without_subscription(mocker):
    return mocker.Mock(subscription=None)


@pytest.fixture
def mock_metadata_validator(mocker):
    return mocker.patch("apps.contributions.stripe_sync.cast_metadata_to_stripe_payment_metadata_schema")


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
def customer():
    # we have some code that looks at type of value sent for customer, so we need to return a stripe.Customer, not a mock
    return stripe.Customer.construct_from({"email": "foo@bar.com", "id": "cus_1", "invoice_settings": None}, key="test")


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
def customer_with_default_pm(customer, payment_method_A):
    return stripe.Customer.construct_from(
        (customer.to_dict() | {"invoice_settings": {"default_payment_method": payment_method_A}}), key="test"
    )


@pytest.mark.django_db
class Test_upsert_payments_for_charge:
    @pytest.fixture
    def contribution(self):
        return ContributionFactory()

    @pytest.fixture(params=["charge", "charge_with_refund"])
    def charge(self, request):
        # This shadows charge fixture in module scope so we test both charge without and charge with refund
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
        upsert_payments_for_charge(contribution=contribution, charge=charge, balance_transaction=balance_transaction)
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
class TestSubscriptionForRecurringContribution:
    @pytest.mark.parametrize("metadata_validates", (True, False))
    def test_init_with_regard_to_metadata_validity(
        self, metadata_validates, mock_metadata_validator, subscription, mocker
    ):
        if not metadata_validates:
            mock_metadata_validator.side_effect = InvalidMetadataError("foo")
            with pytest.raises(InvalidMetadataError):
                SubscriptionForRecurringContribution(subscription=subscription, charges=[])
        else:
            instance = SubscriptionForRecurringContribution(subscription=subscription, charges=[])
            assert instance.subscription == subscription
            assert instance.charges == []

        mock_metadata_validator.assert_called_once_with(subscription.metadata)

    def test__str__(self, subscription, mock_metadata_validator):
        subscription.id = "sub_1"
        assert (
            str(SubscriptionForRecurringContribution(subscription=subscription, charges=[]))
            == f"SubscriptionForRecurringContribution {subscription.id}"
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
        assert SubscriptionForRecurringContribution(subscription=subscription, charges=[]).status == con_status

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
            assert SubscriptionForRecurringContribution.get_interval_from_subscription(subscription) == expected
        else:
            with pytest.raises(InvalidIntervalError):
                SubscriptionForRecurringContribution.get_interval_from_subscription(subscription)

    @pytest.mark.parametrize("customer_exists", (True, False))
    def test_email_id(self, customer_exists, subscription, mocker, mock_metadata_validator):
        if customer_exists:
            subscription.customer = mocker.Mock(email=(email := "foo@bar.com"))
        else:
            subscription.customer = None
        instance = SubscriptionForRecurringContribution(subscription=subscription, charges=[])
        if customer_exists:
            assert instance.email_id == email
        else:
            assert instance.email_id is None

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
        instance = SubscriptionForRecurringContribution(subscription=subscription, charges=[])
        assert instance.payment_method == expected

    @pytest.fixture(params=["subscription", "subscription_with_existing_nre_entities"])
    def subscription_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize("has_email_id", (True, False))
    def test_upsert(self, has_email_id, subscription_to_upsert, mock_metadata_validator, charge, mocker):
        mocker.patch(
            "apps.contributions.stripe_sync.SubscriptionForRecurringContribution.email_id",
            new_callable=mocker.PropertyMock,
            return_value="foo@bar.com" if has_email_id else None,
        )
        # this charge won't get upserted because has no balance_transaction
        charge2 = mocker.Mock(balance_transaction=None)
        mock_upsert_charges = mocker.patch("apps.contributions.stripe_sync.upsert_payments_for_charge")
        instance = SubscriptionForRecurringContribution(subscription=subscription_to_upsert, charges=[charge, charge2])
        if has_email_id:
            contribution, _, _ = instance.upsert()
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
class TestPaymentIntentForOneTimeContribution:
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
            mock_metadata_validator.side_effect = InvalidMetadataError("foo")
            with pytest.raises(InvalidMetadataError):
                PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=charge)
        else:
            instance = PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=charge)
            assert instance.payment_intent == payment_intent
            assert instance.charge == charge
        mock_metadata_validator.assert_called_once_with(payment_intent.metadata)

    def test_init_when_pi_charges_gt_1(self, payment_intent, charge):
        payment_intent.charges.total_count = 2
        with pytest.raises(InvalidStripeTransactionDataError):
            PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=charge)

    def test__str__(self, payment_intent, mock_metadata_validator, mocker):
        payment_intent.id = "pi_1"
        assert (
            str(PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=mocker.Mock()))
            == f"PaymentIntentForOneTimeContribution {payment_intent.id}"
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

    @pytest.fixture
    def charge_with_customer_unexpected_type(self, charge):
        charge.customer = 1
        return charge

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

    @pytest.mark.parametrize("customer_exists", (True, False))
    def test_email_id(self, customer_exists, mocker, payment_intent, charge):
        mocker.patch(
            "apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.customer",
            return_value=mocker.Mock(email=(email := "foo@bar.com")) if customer_exists else None,
            new_callable=mocker.PropertyMock,
        )
        instance = PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=charge)
        if customer_exists:
            assert instance.email_id == email
        else:
            assert instance.email_id is None

    def test_customer(self, charge_value, payment_intent_value, customer):
        instance = PaymentIntentForOneTimeContribution(payment_intent=payment_intent_value, charge=charge_value)
        if any(
            [
                charge_value and charge_value.customer and (isinstance(charge_value.customer, (str, stripe.Customer))),
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
        instance = PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=mocker.Mock())
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
        mocker.patch("apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.refunded", refunded)
        payment_intent.status = pi_status
        instance = PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=mocker.Mock())
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
        mocker.patch("apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.customer", customer)
        expected = request.getfixturevalue(request.param[2]) if request.param[2] else None

        return pi, customer, expected

    def test_payment_method(self, payment_method_state_space, mocker):
        pi, customer, expected = payment_method_state_space
        if customer:
            mocker.patch("stripe.Customer.retrieve", return_value=customer)
        instance = PaymentIntentForOneTimeContribution(payment_intent=pi, charge=None)
        assert instance.payment_method == expected

    @pytest.fixture(params=["payment_intent", "payment_intent_with_existing_nre_entities"])
    def pi_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture
    def charge_no_balance_transaction(self, charge):
        charge.balance_transaction = None
        return charge

    @pytest.fixture(
        params=[
            "charge",
            "charge_no_balance_transaction",
            None,
        ]
    )
    def charge_for_upsert(self, request):
        return request.getfixturevalue(request.param) if request.param else None

    @pytest.mark.parametrize("has_email_id", (True, False))
    def test_upsert(self, pi_to_upsert, has_email_id, charge_for_upsert, mocker, mock_metadata_validator):
        mocker.patch(
            "apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.email_id",
            new_callable=mocker.PropertyMock,
            return_value="foo@bar.com" if has_email_id else None,
        )
        mock_upsert_charges = mocker.patch("apps.contributions.stripe_sync.upsert_payments_for_charge")
        if has_email_id:
            contribution, _, _ = PaymentIntentForOneTimeContribution(
                payment_intent=pi_to_upsert, charge=charge_for_upsert
            ).upsert()
            assert contribution.provider_payment_id == pi_to_upsert.id
            assert contribution.amount == pi_to_upsert.amount
            assert contribution.currency == pi_to_upsert.currency
            assert not contribution.reason
            assert contribution.interval == ContributionInterval.ONE_TIME
            assert contribution.payment_provider_used == "stripe"

            assert contribution.provider_payment_method_id == pi_to_upsert.payment_method.id
            assert contribution.provider_payment_method_details == pi_to_upsert.payment_method.to_dict()
            assert (
                contribution.contributor.email == charge_for_upsert.customer.email
                if charge_for_upsert
                else pi_to_upsert.customer.email
            )
            assert contribution.contribution_metadata == pi_to_upsert.metadata
            assert contribution.status == ContributionStatus.PAID

            if charge_for_upsert and charge_for_upsert.balance_transaction:
                mock_upsert_charges.assert_called_once_with(
                    contribution, charge_for_upsert, charge_for_upsert.balance_transaction
                )
            else:
                mock_upsert_charges.assert_not_called()

            if (
                charge_for_upsert
                and charge_for_upsert.customer
                and isinstance(charge_for_upsert.customer, (str, stripe.Customer))
            ):
                assert contribution.provider_customer_id == charge_for_upsert.customer.id
            elif pi_to_upsert.customer:
                assert contribution.provider_customer_id == pi_to_upsert.customer.id if pi_to_upsert.customer else None
            else:
                assert contribution.provider_customer_id is None
        else:
            with pytest.raises(ValueError):
                PaymentIntentForOneTimeContribution(payment_intent=pi_to_upsert, charge=charge_for_upsert).upsert()

    def test_upsert_when_contributor_exists(self, payment_intent, mocker):
        mocker.patch(
            "apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.email_id",
            new_callable=mocker.PropertyMock,
            return_value=(email := "foo@bar.com"),
        )
        ContributorFactory(email=email)
        mocker.patch("apps.contributions.stripe_sync.upsert_payments_for_charge")
        PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=None).upsert()

    def test_upsert_when_no_email_id(self, payment_intent, mocker):
        mocker.patch(
            "apps.contributions.stripe_sync.PaymentIntentForOneTimeContribution.email_id",
            new_callable=mocker.PropertyMock,
            return_value=None,
        )
        with pytest.raises(ValueError):
            PaymentIntentForOneTimeContribution(payment_intent=payment_intent, charge=mocker.Mock()).upsert()


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

    def test_get_invoices(self, init_kwargs, mocker, invoice_with_subscription):
        mock_invoice_list = mocker.patch("stripe.Invoice.list")
        mock_invoice_list.return_value.auto_paging_iter.return_value = [invoice_with_subscription]
        client = StripeClientForConnectedAccount(**init_kwargs)
        invoices = client.get_invoices()
        assert invoices == [invoice_with_subscription]
        mock_invoice_list.assert_called_once_with(
            limit=MAX_STRIPE_RESPONSE_LIMIT,
            stripe_account=init_kwargs["account_id"],
            created=client.created_query,
        )

    def test_get_payment_intents(self, init_kwargs, payment_intent, mocker):
        mock_pi_list = mocker.patch("stripe.PaymentIntent.list")
        mock_pi_list.return_value.auto_paging_iter.return_value = [payment_intent]
        client = StripeClientForConnectedAccount(**init_kwargs)
        pis = client.get_payment_intents()
        assert pis == [payment_intent]
        mock_pi_list.assert_called_once_with(
            limit=MAX_STRIPE_RESPONSE_LIMIT, stripe_account=init_kwargs["account_id"], created=client.created_query
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

    def test_get_revengine_one_time_payment_intents_and_charges_when_encounter_pi_not_for_one_time(
        self, mocker, payment_intent
    ):
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.is_for_one_time_contribution",
            return_value=False,
        )
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_payment_intents",
            return_value=[payment_intent],
        )
        client = StripeClientForConnectedAccount(account_id="test")
        result = client.get_revengine_one_time_payment_intents_and_charges()
        assert result == []

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

    def test_get_revengine_subscriptions_when_no_subscription(self, invoice_with_subscription, mocker):
        mocker.patch("stripe.Subscription.retrieve", return_value=None)
        mocker.patch(
            "apps.contributions.stripe_sync.StripeClientForConnectedAccount.get_invoices",
            return_value=[invoice_with_subscription],
        )
        response = StripeClientForConnectedAccount(account_id="test").get_revengine_subscriptions(
            [invoice_with_subscription]
        )
        assert len(response) == 0

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


@pytest.mark.django_db
class TestStripeTransactionsSyncer:
    @pytest.mark.parametrize(
        "for_orgs,for_stripe_accounts",
        (([1, 2], ["a", "b"]), ([], [])),
    )
    def test__init__(self, for_orgs, for_stripe_accounts, mocker):
        """This is here so we get test coverage through all possible paths in __post_init__"""
        StripeTransactionsSyncer(for_orgs=for_orgs, for_stripe_accounts=for_stripe_accounts)

    def test_stripe_account_ids(self):
        PaymentProviderFactory.create_batch(2)
        expected = set(
            PaymentProvider.objects.order_by("stripe_account_id")
            .values_list("stripe_account_id", flat=True)
            .distinct("stripe_account_id")
        )
        instance = StripeTransactionsSyncer()
        assert set(instance.stripe_account_ids) == expected

    def test_sync_contributions_and_payments_for_stripe_account(self, mocker):
        mock_sync_subs = mocker.patch(
            "apps.contributions.stripe_sync.StripeTransactionsSyncer.sync_contributions_and_payments_for_subscriptions",
            return_value=[],
        )
        mock_sync_one_times = mocker.patch(
            "apps.contributions.stripe_sync.StripeTransactionsSyncer.sync_contributions_and_payments_for_payment_intents",
            return_value=[],
        )
        StripeTransactionsSyncer().sync_contributions_and_payments_for_stripe_account((test_id := "test"))
        mock_sync_subs.assert_called_once_with(stripe_account_id=test_id)
        mock_sync_one_times.assert_called_once_with(stripe_account_id=test_id)

    @pytest.mark.parametrize("upsert_value_error", (True, False))
    def test_sync_contributions_and_payments_for_subscriptions(self, upsert_value_error, mocker):
        mock_stripe_client = mocker.patch("apps.contributions.stripe_sync.StripeClientForConnectedAccount")
        mock_stripe_client.return_value.get_invoices.return_value = (
            invoices := [
                (expected := mocker.Mock(charge="ch_1")),
                mocker.Mock(charge=None),
            ]
        )
        mock_stripe_client.return_value.get_expanded_charge_object.return_value = (expanded_charge := mocker.Mock())
        mock_stripe_client.return_value.get_revengine_subscriptions_data.return_value = [
            (item1 := mocker.Mock()),
            (item2 := mocker.Mock()),
            (item3 := mocker.Mock()),
        ]
        item1.upsert.side_effect = ValueError("foo")
        item2.upsert.return_value = (contribution1 := mocker.Mock()), True, False
        item3.upsert.return_value = (contribution2 := mocker.Mock()), False, True
        contributions = StripeTransactionsSyncer().sync_contributions_and_payments_for_subscriptions("test_id")
        mock_stripe_client.return_value.get_invoices.assert_called_once()
        mock_stripe_client.return_value.get_expanded_charge_object.assert_called_once_with(
            charge_id=expected.charge, stripe_account_id="test_id"
        )
        mock_stripe_client.return_value.get_revengine_subscriptions_data.assert_called_once_with(
            invoices=invoices, charges=[expanded_charge]
        )
        assert set(contributions) == {contribution1, contribution2}

    def test_sync_contributions_and_payments_for_payment_intents(self, mocker):
        mock_stripe_client = mocker.patch("apps.contributions.stripe_sync.StripeClientForConnectedAccount")
        mock_stripe_client.return_value.get_revengine_one_time_contributions_data.return_value = [
            (item1 := mocker.Mock()),
            (item2 := mocker.Mock()),
            (item_with_error := mocker.Mock()),
        ]
        item1.upsert.return_value = (contribution1 := mocker.Mock()), True, False
        item2.upsert.return_value = (contribution2 := mocker.Mock()), False, True
        item_with_error.upsert.side_effect = ValueError("foo")
        contributions = StripeTransactionsSyncer().sync_contributions_and_payments_for_payment_intents("test_id")
        assert contributions == [contribution1, contribution2]

    def test_sync_stripe_transactions_data(self, mocker):
        PaymentProviderFactory()
        mock_sync_for_stripe_account = mocker.patch(
            "apps.contributions.stripe_sync.StripeTransactionsSyncer.sync_contributions_and_payments_for_stripe_account"
        )
        StripeTransactionsSyncer().sync_stripe_transactions_data()
        mock_sync_for_stripe_account.assert_called_once()


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
