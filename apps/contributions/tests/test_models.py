import datetime
from unittest.mock import patch

from django.db.models import Q
from django.test import TestCase
from django.utils import timezone

from apps.contributions.models import Contribution, ContributionMetadata, Contributor
from apps.contributions.payment_managers import StripePaymentManager
from apps.contributions.tests.factories import ContributionMetadataFactory
from apps.slack.models import SlackNotificationTypes


class ContributorTest(TestCase):
    def setUp(self):
        self.contributor = Contributor.objects.create(email="test@test.com")

    def test_contributions_count(self):
        target_count = 5
        for _ in range(target_count):
            contribution = Contribution.objects.create(amount=1000, contributor=self.contributor)

        self.assertEqual(self.contributor.contributions_count, target_count)

    def test_most_recent_contribution(self):
        first_contribution = Contribution.objects.create(amount=1000, contributor=self.contributor, status="paid")
        one_minute = datetime.timedelta(minutes=1)
        second_contribution = Contribution.objects.create(
            amount=1000,
            contributor=self.contributor,
            status="paid",
            modified=timezone.now() + one_minute,
        )
        self.assertEqual(self.contributor.most_recent_contribution, second_contribution)

    def test__str(self):
        self.assertEqual(str(self.contributor), self.contributor.email)


class ContributionTest(TestCase):
    def setUp(self):
        self.amount = 1000
        self.contribution = Contribution.objects.create(amount=self.amount)

    def test_formatted_amount(self):
        target_format = "10.00 USD"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

    def test_expanded_bad_actor_score(self):
        # First, expanded_bad_actor_score should be none by default
        score = 2
        self.assertIsNone(self.contribution.expanded_bad_actor_score)
        self.contribution.bad_actor_score = score
        self.contribution.save()
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.expanded_bad_actor_score, Contribution.BAD_ACTOR_SCORES[2][1])

    @patch("apps.contributions.models.Contribution.send_slack_notifications")
    def test_save_without_slack_arg_only_saves(self, mock_send_slack):
        self.contribution.amount = 10
        self.contribution.save()
        mock_send_slack.assert_not_called()

    @patch("apps.contributions.models.SlackManager")
    def test_save_with_slack_arg_sends_slack_notifications(self, mock_send_slack):
        self.contribution.amount = 10
        self.contribution.save(slack_notification=SlackNotificationTypes.SUCCESS)
        mock_send_slack.assert_any_call()


class ContributionMetadataTest(TestCase):
    supplied = {
        "email": "test@tester.com",
        "phone": None,
        "state": None,
        "amount": "1400",
        "source": "rev-engine",
        "country": "USA",
        "honoree": "MeMe",
        "test_2": "I love a good test",
    }

    def setUp(self):
        self.cm1 = ContributionMetadataFactory(key="test_1", label="Test 1", donor_supplied=True)
        self.cm2 = ContributionMetadataFactory(key="test_2", label="Test 2", donor_supplied=True)
        self.cm3 = ContributionMetadataFactory(
            key="req_1",
            label="req_1",
            default_value="Required",
            processor_object=ContributionMetadata.ProcessorObjects.ALL,
        )

    def test_label(self):
        assert str(self.cm1) == self.cm1.label

    @patch("apps.contributions.payment_managers.StripePaymentManager")
    def test_bundle_meta_no_lookup(self, pm_mock):
        all_meta = ContributionMetadata.objects.filter(
            Q(processor_object=ContributionMetadata.ProcessorObjects.ALL)
            | Q(processor_object=ContributionMetadata.ProcessorObjects.PAYMENT)
        )

        results = ContributionMetadata.bundle_metadata(all_meta, self.supplied, pm_mock)

        with self.subTest("Required Value is present"):
            assert results.get("req_1", "") == "Required"

        with self.subTest("Default value defers to supplied"):
            self.supplied.update({"req_1": "New Value"})
            results = ContributionMetadata.bundle_metadata(all_meta, self.supplied, pm_mock)
            assert results.get("req_1", "") == "New Value"

        with self.subTest("Empty values are not present"):
            assert results.get("phone", None) is None
            assert results.get("state", None) is None

        with self.subTest("Test 1 is not present"):
            assert results.get("test_1", None) is None

        with self.subTest("Test 2 is present"):
            assert results.get("test_2", None) is not None

    @patch("apps.contributions.payment_managers.StripePaymentManager")
    def test_bundle_meta_w_lookup_payment(self, pm_mock):
        self.cm4 = ContributionMetadataFactory(key="re_revenue_program_id", label="re_revenue_program_id")
        all_meta = ContributionMetadata.objects.filter(
            Q(processor_object=ContributionMetadata.ProcessorObjects.ALL)
            | Q(processor_object=ContributionMetadata.ProcessorObjects.PAYMENT)
        )
        pm_mock.return_value.get_donation_page.return_value.pk = 23
        results = ContributionMetadata.bundle_metadata(all_meta, self.supplied, pm_mock())
        assert results.get("re_revenue_program_id", None) is not None
        assert results.get("re_revenue_program_id", None) == 23

    @patch("apps.contributions.payment_managers.StripePaymentManager")
    def test_bundle_meta_w_lookup_customer(self, pm_mock):
        self.cm5 = ContributionMetadataFactory(
            key="re_contributor_id",
            label="re_contributor_id",
            processor_object=ContributionMetadata.ProcessorObjects.CUSTOMER,
        )

        all_meta = ContributionMetadata.objects.filter(
            Q(processor_object=ContributionMetadata.ProcessorObjects.ALL)
            | Q(processor_object=ContributionMetadata.ProcessorObjects.CUSTOMER)
        )

        pm_mock.return_value.get_or_create_contributor.return_value.pk = 55
        results = ContributionMetadata.bundle_metadata(all_meta, self.supplied, pm_mock())
        assert results.get("re_contributor_id", None) is not None
        assert results.get("re_contributor_id", None) == 55
