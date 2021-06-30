# apps/contributions/serializers.py    1-15

from django.test import TestCase

from apps.contributions import serializers
from apps.contributions.models import Contribution, Contributor


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
