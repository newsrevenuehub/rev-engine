# apps/contributions/serializers.py    1-15

from django.test import TestCase

from apps.contributions import serializers
from apps.contributions.models import Contribution, ContributionStatus
from apps.contributions.tests.factories import ContributionFactory


class ContributionSerializer(TestCase):
    expected_fields = [
        "id",
        "created",
        "modified",
        "amount",
        "currency",
        "payment_provider_data",
        "provider_payment_id",
        "status",
        "contributor",
        "donation_page",
        "organization",
    ]

    def setUp(self):
        self.serializer = serializers.ContributionSerializer
        self.contribution = Contribution.objects.create(amount=1000)

    def test_returned_fields(self):
        data = self.serializer(self.contribution).data
        for field in self.expected_fields:
            self.assertIn(field, data)


class ContributorContributionSerializerTest(TestCase):
    def setUp(self):
        self.serializer = serializers.ContributorContributionSerializer
        self.contribution = ContributionFactory()

    def _create_contribution(self, **kwargs):
        return ContributionFactory(**kwargs)

    def test_status_resolved_to_public_value(self):
        failed_cont = self._create_contribution(status=ContributionStatus.FAILED)
        flagged_cont = self._create_contribution(status=ContributionStatus.FLAGGED)
        rejected_cont = self._create_contribution(status=ContributionStatus.REJECTED)
        processing_cont = self._create_contribution(status=ContributionStatus.PROCESSING)
        paid_cont = self._create_contribution(status=ContributionStatus.PAID)
        canceled_cont = self._create_contribution(status=ContributionStatus.CANCELED)

        failed_data = self.serializer(failed_cont).data
        flagged_data = self.serializer(flagged_cont).data
        rejected_data = self.serializer(rejected_cont).data

        # These three shoudl resolve to "failed", for end-user facing content
        for data in [failed_data, flagged_data, rejected_data]:
            self.assertEqual(data["status"], ContributionStatus.FAILED)

        # The rest are fine as they are.
        processing_data = self.serializer(processing_cont).data
        self.assertEqual(processing_data["status"], ContributionStatus.PROCESSING)
        paid_data = self.serializer(paid_cont).data
        self.assertEqual(paid_data["status"], ContributionStatus.PAID)
        canceled_data = self.serializer(canceled_cont).data
        self.assertEqual(canceled_data["status"], ContributionStatus.CANCELED)
