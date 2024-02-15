import datetime

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
    UntrackedOneTimePaymentIntent,
    UntrackedStripeSubscription,
    _upsert_payments_for_charge,
)
from apps.contributions.tests.factories import ContributionFactory, PaymentFactory
from apps.contributions.types import (
    StripePaymentMetadataSchemaV1_4,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory


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
    return mocker.patch(
        "apps.contributions.stripe_contributions_provider.cast_metadata_to_stripe_payment_metadata_schema"
    )


@pytest.fixture
def valid_metadata():
    return StripePaymentMetadataSchemaV1_4(
        agreed_to_pay_fees=False,
        donor_selected_amount=1000.0,
        referer="https://www.google.com/",
        revenue_program_id=1,
        revenue_program_slug="testrp",
        schema_version="1.4",
    ).to_dict()


@pytest.fixture
def subscription(mocker, valid_metadata):
    customer = mocker.Mock(email="foo@bar.com", id="cus_1")
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
def charge(mocker, refund, balance_transaction):
    charge = mocker.Mock(
        amount=1000,
        created=datetime.datetime.now().timestamp(),
        balance_transaction=balance_transaction,
        customer=mocker.Mock(email="foo@bar.com", id="cus_1"),
    )
    charge.refunds.data = [refund]
    return charge


@pytest.fixture
def subscription_with_existing_nre_entities(subscription):
    ContributionFactory(provider_subscription_id=subscription.id, contributor__email=subscription.customer.email)
    return subscription


@pytest.mark.django_db
class Test__upsert_payments_for_charge:
    @pytest.fixture(params=[True, False])
    def contribution(self, request, refund, balance_transaction):
        contribution = ContributionFactory()
        # whether or not existing payments should be created
        if request.param:
            PaymentFactory(
                contribution=contribution,
                stripe_balance_transaction_id=balance_transaction.id,
            )
            PaymentFactory(contribution=contribution, stripe_balance_transaction_id=refund.balance_transaction.id)
        return contribution

    def test_happy_path(self, contribution, balance_transaction, charge, refund):
        existing_payments_count = contribution.payment_set.count()
        _upsert_payments_for_charge(contribution=contribution, charge=charge, balance_transaction=balance_transaction)
        contribution.refresh_from_db()
        assert contribution.payment_set.count() == existing_payments_count + (2 if existing_payments_count == 0 else 0)
        assert Payment.objects.filter(
            contribution=contribution,
            stripe_balance_transaction_id=balance_transaction.id,
            net_amount_paid=balance_transaction.net,
            gross_amount_paid=balance_transaction.amount,
            amount_refunded=0,
            transaction_time__isnull=False,
        ).exists()
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

    def test_payment_method(self):
        pass

    @pytest.fixture(params=["subscription", "subscription_with_existing_nre_entities"])
    def subscription_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    def test_upsert(self, subscription_to_upsert, mock_metadata_validator, charge, mocker):
        mock_upsert_charges = mocker.patch(
            "apps.contributions.stripe_contributions_provider._upsert_payments_for_charge"
        )
        instance = UntrackedStripeSubscription(subscription=subscription_to_upsert, charges=[charge])
        contribution = instance.upsert()
        assert contribution.provider_subscription_id == subscription_to_upsert.id
        assert contribution.amount == subscription_to_upsert.plan.amount
        assert contribution.currency == subscription_to_upsert.plan.currency
        assert contribution.reason == ""
        assert contribution.interval == ContributionInterval.MONTHLY
        assert contribution.payment_provider_used == "stripe"
        assert contribution.provider_customer_id == subscription_to_upsert.customer.id
        assert contribution.provider_payment_method_id == subscription_to_upsert.default_payment_method.id
        assert contribution.provider_payment_method_details == subscription_to_upsert.default_payment_method.to_dict()
        assert contribution.contributor.email == subscription_to_upsert.customer.email
        assert contribution.contribution_metadata == subscription_to_upsert.metadata
        assert contribution.status == ContributionStatus.PAID
        mock_upsert_charges.assert_called_once_with(contribution, charge, charge.balance_transaction)


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
        with pytest.raises(InvalidMetadataError):
            UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=charge)

    def test__str__(self, payment_intent, mock_metadata_validator, mocker):
        payment_intent.id = "pi_1"
        assert (
            str(UntrackedOneTimePaymentIntent(payment_intent=payment_intent, charge=mocker.Mock()))
            == f"UntrackedOneTimePaymentIntent {payment_intent.id}"
        )

    def test_customer(self):
        pass

    def test_email_id(self, payment_intent, mocker):
        pass

    def test_refunded(self, payment_intent, mocker):
        pass

    def test_status(self, payment_intent, mocker):
        pass

    def test_payment_method(self, payment_intent, mocker):
        pass

    @pytest.fixture(params=["payment_intent", "payment_intent_with_existing_nre_entities"])
    def pi_to_upsert(self, request):
        return request.getfixturevalue(request.param)

    def test_upsert(self, pi_to_upsert, charge, mocker, mock_metadata_validator):
        mock_upsert_charges = mocker.patch(
            "apps.contributions.stripe_contributions_provider._upsert_payments_for_charge"
        )
        contribution = UntrackedOneTimePaymentIntent(payment_intent=pi_to_upsert, charge=charge).upsert()
        assert contribution.provider_payment_id == pi_to_upsert.id
        assert contribution.amount == pi_to_upsert.amount
        assert contribution.currency == pi_to_upsert.currency
        assert contribution.reason == ""
        assert contribution.interval == ContributionInterval.ONE_TIME
        assert contribution.payment_provider_used == "stripe"
        assert contribution.provider_customer_id == charge.customer.id
        assert contribution.provider_payment_method_id == pi_to_upsert.payment_method.id
        assert contribution.provider_payment_method_details == pi_to_upsert.payment_method.to_dict()
        assert contribution.contributor.email == charge.customer.email
        assert contribution.contribution_metadata == pi_to_upsert.metadata
        # it's refunded because the charge is refunded
        assert contribution.status == ContributionStatus.REFUNDED
        mock_upsert_charges.assert_called_once_with(contribution, charge, charge.balance_transaction)


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
        retrieved = client.get_subscription((sub_id := "sub_1"))
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == sub
        mock_sub_retrieve.assert_called_once_with(
            sub_id,
            stripe_account=init_kwargs["account_id"],
            expand=StripeClientForConnectedAccount.DEFAULT_GET_SUBSCRIPTION_EXPAND_FIELDS,
        )

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_invoice(self, raise_invalid_request_error, init_kwargs, mocker):
        client = StripeClientForConnectedAccount(**init_kwargs)
        mock_invoice_retrieve = mocker.patch("stripe.Invoice.retrieve")
        if raise_invalid_request_error:
            mock_invoice_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "inv_1")
            retrieved = client.get_invoice((invoice_id := "inv_1"))
            assert retrieved is None
        else:
            invoice = mocker.Mock()
            mock_invoice_retrieve.return_value = invoice
            retrieved = client.get_invoice((invoice_id := "inv_1"))
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
            "apps.contributions.stripe_contributions_provider.StripeClientForConnectedAccount.get_payment_intents",
            return_value=[payment_intent],
        )
        client = StripeClientForConnectedAccount(account_id="test")
        assert client.get_revengine_one_time_payment_intents_and_charges() == [payment_intent]

    def test_get_revengine_subscriptions(self, invoice_with_subscription, subscription, mocker):
        mocker.patch("stripe.Subscription.retrieve", return_value=subscription)
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeClientForConnectedAccount.get_invoices",
            return_value=[invoice_with_subscription],
        )
        client = StripeClientForConnectedAccount(account_id="test")
        assert client.get_revengine_subscriptions() == [invoice_with_subscription.subscription]

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_expanded_charge_object(self, raise_invalid_request_error, charge, mocker):
        mock_retrieve = mocker.patch("stripe.Charge.retrieve")
        if raise_invalid_request_error:
            mock_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "ch_1")
        else:
            mock_retrieve.return_value = charge
        retrieved = StripeClientForConnectedAccount(account_id=(accound_id := "test")).get_expanded_charge_object(
            (charge_id := "charge_1")
        )
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == charge

        mock_retrieve.assert_called_once_with(
            charge.id,
            expand=StripeClientForConnectedAccount.DEFAULT_GET_EXPANDED_CHARGE_OBJECT_EXPAND_FIELDS,
            stripe_account=accound_id,
        )

    def test_get_revengine_subscriptions_data(self, subscription, invoice_with_subscription, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeClientForConnectedAccount.get_revengine_subscriptions",
            return_value=[subscription],
        )
        invoice_with_subscription.subscription = subscription.id
        data = StripeClientForConnectedAccount(account_id="test").get_revengine_subscriptions_data(
            invoices=[invoice_with_subscription], charges=[]
        )
        assert len(data) == 1
        assert data[0]["subscription"] == subscription

    # also need unhappy path
    def test_get_revengine_one_time_contributions_data(self, payment_intent, charge, mocker):
        mocker.patch(
            "apps.contributions.stripe_contributions_provider.StripeClientForConnectedAccount.get_revengine_one_time_payment_intents_and_charges",
            return_value=[{"payment_intent": payment_intent, "charge": charge}],
        )
        data = StripeClientForConnectedAccount(account_id="test").get_revengine_one_time_contributions_data()
        assert len(data) == 1
        assert data[0].payment_intent == payment_intent
        assert data[0].charge == charge

    @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    def test_get_payment_method(self, raise_invalid_request_error, mocker):
        mock_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        if raise_invalid_request_error:
            mock_retrieve.side_effect = stripe.error.InvalidRequestError("not found", "id", "pm_1")
        else:
            mock_retrieve.return_value = (pm := mocker.Mock())
        retrieved = StripeClientForConnectedAccount(account_id="test").get_payment_method((pm_id := "pm_1"))
        if raise_invalid_request_error:
            assert retrieved is None
        else:
            assert retrieved == pm
        mock_retrieve.assert_called_once_with(
            pm_id,
            stripe_account="test",
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
        )

    # @pytest.mark.parametrize("raise_invalid_request_error", (True, False))
    # def test_get_stripe_event(self):
    #     pass


@pytest.mark.django_db
class TestStripeToRevengineTransformer:
    def test_query_configuration(self):
        """Show that the query configuration is as expected given init values"""
        pass

    def test_stripe_account_ids(self):
        pass

    def test_backfill_contributions_and_payments_for_stripe_account(self):
        pass

    def test_backfill_contributions_and_payments_for_subscriptions(self):
        pass

    def test_backfill_contributions_and_payments_for_payment_intents(self):
        pass

    def test_backfill_contributions_and_payments_from_stripe(self):
        pass

    @pytest.fixture()
    def orgs(self):
        orgs = []
        for _ in range(2):
            org = OrganizationFactory()
            RevenueProgramFactory(organization=org)
            orgs.append(org)
        return orgs

    # def test_backfill_contributions_and_payments_from_stripe(self, orgs, mocker):
    #     # transformer = StripeToRevengineTransformer()
    #     # transformer.backfill_contributions_and_payments_from_stripe()
    #     pass


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
        logger_spy = mocker.patch("apps.contributions.stripe_contributions_provider.logger.warning")
        mocker.patch("stripe.Event.retrieve", return_value=unsupported_event)
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        syncer = StripeEventSyncer(stripe_account_id="test", event_id="evt_1", async_mode=False)
        syncer.sync()
        logger_spy.assert_called_once_with("Event type %s is not supported", unsupported_event.type)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()

    def test_when_event_not_found(self, supported_event, mocker):
        logger_spy = mocker.patch("apps.contributions.stripe_contributions_provider.logger.warning")
        mocker.patch("stripe.Event.retrieve", side_effect=stripe.error.InvalidRequestError("not found", "id", "evt_1"))
        mock_process_webhook = mocker.patch("apps.contributions.tasks.process_stripe_webhook_task")
        syncer = StripeEventSyncer(stripe_account_id="test", event_id="evt_1", async_mode=False)
        syncer.sync()
        assert logger_spy.call_args == mocker.call("No event found for event id %s", supported_event.id)
        mock_process_webhook.assert_not_called()
        mock_process_webhook.delay.assert_not_called()
