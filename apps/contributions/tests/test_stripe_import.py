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
from apps.contributions.models import ContributionInterval, ContributionStatus, Payment, Contributor
from apps.contributions.stripe_import import (
    MAX_STRIPE_RESPONSE_LIMIT,
    PaymentIntentForOneTimeContribution,
    StripeEventProcessor,
    StripeTransactionsImporter,
    SubscriptionForRecurringContribution,
    upsert_payment_for_transaction,
)
from apps.contributions.tests.factories import (
    ContributionFactory,
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
    return mocker.patch("apps.contributions.stripe_import.cast_metadata_to_stripe_payment_metadata_schema")


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
        upsert_payment_for_transaction(contribution=contribution, transaction=balance_transaction, is_refund=is_refund)
        contribution.refresh_from_db()
        assert contribution.payment_set.count() == 1
        assert Payment.objects.filter(
            contribution=contribution,
            stripe_balance_transaction_id=balance_transaction.id,
            net_amount_paid=balance_transaction.net if not is_refund else 0,
            gross_amount_paid=balance_transaction.amount if not is_refund else 0,
            amount_refunded=balance_transaction.amount if is_refund else 0,
            transaction_time__isnull=False,
        ).exists()

    def test_when_transaction_is_none(self, contribution, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_import.logger.warning")
        mock_upsert = mocker.patch("apps.common.utils.upsert_with_diff_check")
        upsert_payment_for_transaction(contribution=contribution, transaction=None)
        logger_spy.assert_called_once()
        mock_upsert.assert_not_called()


@pytest.mark.django_db
class TestSubscriptionForRecurringContribution:

    def test_init_when_customer_not_validate(self, subscription):
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=None)
        assert str(exc_info.value) == f"Subscription {subscription.id} has no customer associated with it"

    def test_init_when_email_id_not_validate(self, subscription, mocker, customer):
        customer.email = None
        with pytest.raises(InvalidStripeTransactionDataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        assert str(exc_info.value) == f"Subscription {subscription.id} has no email associated with it"

    def test_init_when_metadata_not_validate(self, subscription, customer, mock_metadata_validator):
        mock_metadata_validator.side_effect = InvalidMetadataError("foo")
        with pytest.raises(InvalidMetadataError) as exc_info:
            SubscriptionForRecurringContribution(subscription=subscription, charges=[], refunds=[], customer=customer)
        mock_metadata_validator.assert_called_once_with(subscription.metadata)

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
    def subscription_to_upsert(self, request):
        return request.getfixturevalue(request.param), (
            True if request.param == "subscription_with_existing_nre_entities" else False
        )

    def test_upsert(self, subscription_to_upsert, charge, refund, customer, mocker):
        subscription, existing_entities = subscription_to_upsert
        mock_upsert_payment = mocker.patch("apps.contributions.stripe_import.upsert_payment_for_transaction")
        instance = SubscriptionForRecurringContribution(
            subscription=subscription, charges=[charge], refunds=[refund], customer=customer
        )
        contribution, action = instance.upsert()
        assert contribution.provider_subscription_id == subscription.id
        assert contribution.amount == subscription.plan.amount
        assert contribution.currency == subscription.plan.currency
        assert contribution.reason == ""
        assert contribution.interval == ContributionInterval.MONTHLY
        assert contribution.payment_provider_used == "stripe"
        assert contribution.provider_customer_id == subscription.customer.id
        assert contribution.provider_payment_method_id == subscription.default_payment_method.id
        assert contribution.provider_payment_method_details == subscription.default_payment_method.to_dict()
        assert contribution.contributor.email == subscription.customer.email
        assert contribution.contribution_metadata == subscription.metadata
        assert contribution.status == ContributionStatus.PAID
        assert Contributor.objects.filter(email=customer.email).exists
        assert action == ("created" if not existing_entities else "updated")
        mock_upsert_payment.assert_any_call(contribution, charge.balance_transaction, is_refund=False)
        mock_upsert_payment.assert_any_call(contribution, refund.balance_transaction, is_refund=True)


@pytest.mark.django_db
class TestPaymentIntentForOneTimeContribution:

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
            (False, "anything_else", ContributionStatus.PROCESSING),
        ),
    )
    def test_status(self, refunded, pi_status, expected, payment_intent, mocker, customer):
        mocker.patch("apps.contributions.stripe_import.PaymentIntentForOneTimeContribution.refunded", refunded)
        payment_intent.status = pi_status
        instance = PaymentIntentForOneTimeContribution(
            payment_intent=payment_intent, charges=[], customer=customer, refunds=[]
        )
        assert instance.status == expected

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

    @pytest.fixture(params=["payment_intent_with_existing_nre_entities"])
    def pi_to_upsert(self, request):
        return request.getfixturevalue(request.param), (
            True if request.param == "payment_intent_with_existing_nre_entities" else False
        )

    def test_upsert(self, pi_to_upsert, customer, charge, refund, mocker):
        payment_intent, existing_entities = pi_to_upsert
        mock_upsert_payment = mocker.patch("apps.contributions.stripe_import.upsert_payment_for_transaction")
        contribution, action = PaymentIntentForOneTimeContribution(
            payment_intent=payment_intent, charges=[charge], customer=customer, refunds=[refund]
        ).upsert()
        assert contribution.provider_payment_id == payment_intent.id
        assert contribution.amount == payment_intent.amount
        assert contribution.currency == payment_intent.currency
        assert not contribution.reason
        assert contribution.interval == ContributionInterval.ONE_TIME
        assert contribution.payment_provider_used == "stripe"
        assert contribution.provider_payment_method_id == payment_intent.payment_method.id
        assert contribution.provider_payment_method_details == payment_intent.payment_method.to_dict()
        assert contribution.contributor.email == customer.email
        assert contribution.contribution_metadata == payment_intent.metadata
        # because we send a refund, the status is refunded
        assert contribution.status == ContributionStatus.REFUNDED
        assert contribution.provider_customer_id == customer.id
        assert action == ("updated" if existing_entities else "created")
        assert Contributor.objects.filter(email=customer.email).exists
        mock_upsert_payment.assert_any_call(contribution, charge.balance_transaction, is_refund=False)
        mock_upsert_payment.assert_any_call(contribution, refund.balance_transaction, is_refund=True)


# @pytest.mark.django_db
# class TestStripeTransactionsImporter:
#     @pytest.mark.parametrize(
#         "for_orgs,for_stripe_accounts",
#         (([1, 2], ["a", "b"]), ([], [])),
#     )
#     def test__init__(self, for_orgs, for_stripe_accounts, mocker):
#         """This is here so we get test coverage through all possible paths in __post_init__"""
#         StripeTransactionsImporter(for_orgs=for_orgs, for_stripe_accounts=for_stripe_accounts)

#     def test_stripe_account_ids(self):
#         PaymentProviderFactory.create_batch(2)
#         expected = set(
#             PaymentProvider.objects.order_by("stripe_account_id")
#             .values_list("stripe_account_id", flat=True)
#             .distinct("stripe_account_id")
#         )
#         instance = StripeTransactionsImporter()
#         assert set(instance.stripe_account_ids) == expected

#     def test_import_contributions_and_payments_for_stripe_account(self, mocker):
#         mock_import_subs = mocker.patch(
#             "apps.contributions.stripe_import.StripeTransactionsImporter.import_contributions_and_payments_for_subscriptions",
#             return_value=[],
#         )
#         mock_import_one_times = mocker.patch(
#             "apps.contributions.stripe_import.StripeTransactionsImporter.import_contributions_and_payments_for_payment_intents",
#             return_value=[],
#         )
#         StripeTransactionsImporter().import_contributions_and_payments_for_stripe_account((test_id := "test"))
#         mock_import_subs.assert_called_once_with(stripe_account_id=test_id)
#         mock_import_one_times.assert_called_once_with(stripe_account_id=test_id)

#     def test_import_contributions_and_payments_for_subscriptions(self, mocker):
#         mock_stripe_client = mocker.patch("apps.contributions.stripe_import.StripeClientForConnectedAccount")
#         mock_stripe_client.return_value.get_invoices.return_value = (
#             invoices := [
#                 (expected := mocker.Mock(charge="ch_1")),
#                 mocker.Mock(charge=None),
#             ]
#         )
#         mock_stripe_client.return_value.get_expanded_charge_object.return_value = (expanded_charge := mocker.Mock())
#         mock_stripe_client.return_value.get_revengine_subscriptions_data.return_value = [
#             (item1 := mocker.Mock()),
#             (item2 := mocker.Mock()),
#             (item3 := mocker.Mock()),
#         ]
#         item1.upsert.side_effect = InvalidStripeTransactionDataError("foo")
#         item2.upsert.return_value = (contribution1 := mocker.Mock()), "created"
#         item3.upsert.return_value = (contribution2 := mocker.Mock()), "updated"
#         contributions = StripeTransactionsImporter().import_contributions_and_payments_for_subscriptions("test_id")
#         mock_stripe_client.return_value.get_invoices.assert_called_once()
#         mock_stripe_client.return_value.get_expanded_charge_object.assert_called_once_with(
#             charge_id=expected.charge, stripe_account_id="test_id"
#         )
#         mock_stripe_client.return_value.get_revengine_subscriptions_data.assert_called_once_with(
#             invoices=invoices, charges=[expanded_charge]
#         )
#         assert set(contributions) == {contribution1, contribution2}

#     def test_import_contributions_and_payments_for_payment_intents(self, mocker):
#         mock_stripe_client = mocker.patch("apps.contributions.stripe_import.StripeClientForConnectedAccount")
#         mock_stripe_client.return_value.get_revengine_one_time_contributions_data.return_value = [
#             (item1 := mocker.Mock()),
#             (item2 := mocker.Mock()),
#             (item_with_error := mocker.Mock()),
#         ]
#         item1.upsert.return_value = (contribution1 := mocker.Mock()), "created"
#         item2.upsert.return_value = (contribution2 := mocker.Mock()), "updated"
#         item_with_error.upsert.side_effect = InvalidStripeTransactionDataError("foo")
#         contributions = StripeTransactionsImporter().import_contributions_and_payments_for_payment_intents("test_id")
#         assert contributions == [contribution1, contribution2]

#     def test_import_stripe_transactions_data(self, mocker):
#         PaymentProviderFactory()
#         mock_import_for_stripe_account = mocker.patch(
#             "apps.contributions.stripe_import.StripeTransactionsImporter.import_contributions_and_payments_for_stripe_account"
#         )
#         StripeTransactionsImporter().import_stripe_transactions_data()
#         mock_import_for_stripe_account.assert_called_once()


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
