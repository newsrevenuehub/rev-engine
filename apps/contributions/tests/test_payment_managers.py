from collections.abc import Callable

import pytest
import pytest_mock
import stripe
from addict import Dict as AttrDict

from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError, StripePaymentManager
from apps.contributions.tests.factories import ContributionFactory


@pytest.mark.django_db
class TestStripePaymentManager:
    @pytest.mark.parametrize(
        "make_contribution_fn,",
        [
            lambda: ContributionFactory(one_time=True, flagged=True),
            lambda: ContributionFactory(monthly_subscription=True, flagged=True),
        ],
    )
    @pytest.mark.parametrize("reject", [True, False])
    def test_complete_payment(
        self,
        make_contribution_fn: Callable,
        reject: bool,
        mocker: pytest_mock.MockerFixture,
    ):
        spm = StripePaymentManager(contribution=(contribution := make_contribution_fn()))
        mock_pi_retrieve = mocker.patch("stripe.PaymentIntent.retrieve")
        mock_si_retrieve = mocker.patch("stripe.SetupIntent.retrieve", return_value=AttrDict({"id": "si_id_123"}))
        mocker.patch("stripe.Subscription.list")
        mock_si_retrieve.return_value.payment_method = "pm_id_123"
        mock_si_retrieve.return_value.metadata = {"meta": "data"}
        mock_pm_retrieve = mocker.patch("stripe.PaymentMethod.retrieve")
        mock_pm_retrieve.return_value = AttrDict(
            {"id": "pm_id_123", "card": AttrDict({"brand": "visa", "last4": "1234"})}
        )
        mock_pm_retrieve.return_value.detach = mocker.Mock()
        mock_sub_create = mocker.patch(
            "stripe.Subscription.create",
            return_value=stripe.Subscription.construct_from(
                {"id": "sub_id_123", "latest_invoice": {"payment_intent": {"id": "pi_test"}}}, key="test"
            ),
        )
        save_spy = mocker.spy(Contribution, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value = mocker.Mock()
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        spm.complete_payment(reject=reject)
        contribution.refresh_from_db()
        if contribution.interval == ContributionInterval.ONE_TIME:
            mock_pi_retrieve.assert_called_once_with(
                contribution.provider_payment_id,
                stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
            )
            if reject:
                mock_pi_retrieve.return_value.cancel.assert_called_once_with(
                    contribution.provider_payment_id,
                    stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
                    cancellation_reason="fraudulent",
                )
            else:
                mock_pi_retrieve.return_value.capture.assert_called_once_with(
                    contribution.provider_payment_id,
                    stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
                )

        else:
            mock_si_retrieve.assert_called_once_with(
                contribution.provider_setup_intent_id,
                stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
            )
            mock_pm_retrieve.assert_called_once_with(
                contribution.provider_payment_method_id,
                stripe_account=contribution.revenue_program.payment_provider.stripe_account_id,
            )
            if reject:
                mock_pm_retrieve.return_value.detach.assert_called_once()
            else:
                mock_sub_create.assert_called_once()
                assert contribution.provider_subscription_id == mock_sub_create.return_value.id
                assert contribution.provider_payment_id == mock_sub_create.return_value.latest_invoice.payment_intent.id
        expected_update_fields = {"status", "modified"}
        if not reject and contribution.interval != ContributionInterval.ONE_TIME:
            expected_update_fields.update({"provider_subscription_id", "provider_payment_id"})
        save_spy.assert_called_once_with(
            contribution,
            update_fields=expected_update_fields,
        )
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once()
        assert contribution.status == ContributionStatus.REJECTED if reject else ContributionStatus.PAID

    def test_complete_payment_when_one_time_and_no_provider_payment_id(self, mocker):
        contribution = ContributionFactory(one_time=True, flagged=True, provider_payment_id=None)
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError) as exc:
            spm.complete_payment()
        assert str(exc.value) == "Cannot retrieve payment data"

    def test_complete_payment_when_one_time_and_no_pi(self, mocker):
        contribution = ContributionFactory(one_time=True, flagged=True)
        mocker.patch("stripe.PaymentIntent.retrieve", return_value=None)
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError):
            spm.complete_payment()
        save_spy.assert_not_called()

    def test_complete_payment_when_one_time_and_cancel_fails(self, mocker):
        contribution = ContributionFactory(one_time=True, flagged=True)
        mock_pi = mocker.patch("stripe.PaymentIntent.retrieve")
        mock_pi.return_value.cancel.side_effect = stripe.error.StripeError
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError):
            spm.complete_payment(reject=True)
        save_spy.assert_not_called()

    def test_complete_payment_when_one_time_and_capture_fails(self, mocker):
        contribution = ContributionFactory(one_time=True, flagged=True)
        mock_pi = mocker.patch("stripe.PaymentIntent.retrieve", return_value=AttrDict({"payment_method": "pm_id"}))
        mock_pi.return_value.capture = mocker.Mock(side_effect=stripe.error.StripeError)
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError):
            spm.complete_payment(reject=False)
        save_spy.assert_not_called()

    def test_complete_payment_when_recurring_and_reject_and_no_pm(self, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        mocker.patch("stripe.SetupIntent.retrieve")
        mocker.patch("stripe.PaymentMethod.retrieve", return_value=None)
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        spm.complete_payment(reject=True)
        save_spy.assert_called_once()

    def test_complete_payment_when_recurring_and_reject_and_detach_fails(self, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        mock_si = mocker.patch("stripe.SetupIntent.retrieve")
        mock_si.return_value.payment_method = "pm_123"
        mock_pm = mocker.patch("stripe.PaymentMethod.retrieve")
        mock_pm.return_value.detach.side_effect = stripe.error.StripeError("uh oh")
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        spm.complete_payment(reject=True)
        save_spy.assert_called_once()
        contribution.refresh_from_db()
        assert contribution.status == ContributionStatus.REJECTED

    def test_complete_payment_when_recurring_and_not_reject_and_not_si(self, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        mocker.patch("stripe.SetupIntent.retrieve", return_value=None)
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError):
            spm.complete_payment(reject=False)
        save_spy.assert_not_called()

    def test_complete_payment_when_recurring_and_not_reject_and_subscription_create_fails(self, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        model_create_sub_spy = mocker.spy(Contribution, "create_stripe_subscription")
        mocker.patch("stripe.SetupIntent.retrieve")
        mocker.patch("stripe.PaymentMethod.retrieve")
        mocker.patch("stripe.Subscription.create", side_effect=stripe.error.StripeError)
        mocker.patch("stripe.Subscription.list")
        save_spy = mocker.spy(Contribution, "save")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError):
            spm.complete_payment(reject=False)
        model_create_sub_spy.assert_called_once()
        save_spy.assert_not_called()

    def test_complete_payment_when_recurring_and_accept_and_existing_subscription_with_provider_subscription_id(
        self, mocker
    ):
        mocker.patch(
            "stripe.SetupIntent.retrieve", return_value=(si := mocker.Mock(payment_method="pm_123", id="si_123"))
        )
        mock_sub_list = mocker.patch("stripe.Subscription.list")
        mock_sub_list.return_value.auto_paging_iter.return_value = [
            mocker.Mock(
                payment_method=si.payment_method,
                id=(sub_id := "sub_123"),
                status="active",
                latest_invoice=mocker.Mock(payment_intent=(mocker.Mock(id="pi_123"))),
            )
        ]
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        ContributionFactory(monthly_subscription=True, flagged=True, provider_subscription_id=sub_id)
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError) as exc:
            spm.complete_payment(reject=False)
        assert f"Subscription {sub_id} already exists on contribution" in str(exc.value)

    def test_complete_payment_when_recurring_and_accept_and_existing_subscription_with_si_pm(self, mocker):
        mocker.patch(
            "stripe.SetupIntent.retrieve", return_value=(si := mocker.Mock(payment_method="pm_123", id="si_123"))
        )
        mock_sub_list = mocker.patch("stripe.Subscription.list")
        mock_sub_list.return_value.auto_paging_iter.return_value = [
            mocker.Mock(
                payment_method=si.payment_method,
                id=(sub_id := "sub_123"),
                status="active",
                latest_invoice=mocker.Mock(payment_intent=(pi := mocker.Mock(id="pi_123"))),
            )
        ]
        contribution = ContributionFactory(monthly_subscription=True, flagged=True)
        spm = StripePaymentManager(contribution=contribution)
        spm.complete_payment(reject=False)
        contribution.refresh_from_db()
        assert contribution.provider_subscription_id == sub_id
        assert contribution.provider_payment_id == pi.id
        assert contribution.status == ContributionStatus.PAID

    def test_init_when_contribution_not_instance_contribution(self, mocker):
        mocker.patch("apps.contributions.payment_managers.StripePaymentManager.get_serializer_class")
        with pytest.raises(
            ValueError, match="PaymentManager contribution argument expected an instance of Contribution."
        ):
            StripePaymentManager(contribution=True, data={})

    def test_init_when_both_contribution_and_data(self):
        with pytest.raises(
            ValueError, match="PaymentManager must be initialized with either data or a contribution, not both"
        ):
            StripePaymentManager(contribution=ContributionFactory(), data={"something": "else"})

    def test__handle_when_existing_subscription_with_si_pm_when_already_have_subscription(self, mocker):
        contribution = ContributionFactory(monthly_subscription=True, flagged=True, provider_subscription_id="sub_123")
        spm = StripePaymentManager(contribution=contribution)
        with pytest.raises(PaymentProviderError, match="Contribution already has a subscription"):
            spm._handle_when_existing_subscription_with_si_pm(
                subscription=mocker.Mock(id="sub_123"), setup_intent=mocker.Mock(), update_data={}
            )
