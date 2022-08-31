from rest_framework import serializers


class StripeAmountField(serializers.IntegerField):
    def convert_amount_to_cents(self, amount):
        """
        Convert decimal amount to "cent" amount as required by Stripe
        """
        return int(float(amount) * 100)

    def to_internal_value(self, raw_value):
        return self.convert_amount_to_cents(raw_value)
