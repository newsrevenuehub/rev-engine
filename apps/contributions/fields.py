from rest_framework import serializers


class StripeAmountField(serializers.IntegerField):
    def to_internal_value(self, raw_value):
        """Convert decimal amount to "cent" amount as required by Stripe."""
        return int(float(raw_value) * 100)

    def to_representation(self, value):
        """Convert "cent" amount as required by Stripe to decimal amount."""
        return str(float(value / 100))
