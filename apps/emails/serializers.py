from rest_framework import serializers

from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution
from apps.emails.models import EmailCustomization, TransactionalEmailNames


class EmailCustomizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailCustomization
        fields = [
            "id",
            "revenue_program",
            "email_type",
            "email_block",
            "content_html",
            "content_plain_text",
        ]
        read_only_fields = ["id", "content_plain_text"]


class TriggerFailedPaymentNotificationSerializer(serializers.Serializer):
    contribution = serializers.PrimaryKeyRelatedField(
        queryset=Contribution.objects.all(),
        help_text="The contribution for which the email is being sent.",
    )


class TriggerAnnualPaymentReminderSerializer(serializers.Serializer):

    contribution = serializers.PrimaryKeyRelatedField(
        queryset=Contribution.objects.all(),
        help_text="The contribution for which the transactional email is being sent.",
    )
    next_charge_date = serializers.DateField(help_text="The date of the next charge for the recurring contribution.")
    unique_identifier = serializers.CharField(
        max_length=300,
        help_text="A unique identifier for the email, such as a webhook event ID or similar to ensure transactional "
        "emails are not sent multiple times for the same event.",
    )

    class Meta:
        fields = [
            "contribution",
            "next_charge_date",
            "unique_identifier",
        ]

    def validate_contribution(self, value: Contribution) -> Contribution:
        if value.interval != ContributionInterval.YEARLY.value:
            raise serializers.ValidationError(
                f"Contribution must be yearly for email type '{TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER.value}'. "
                f"Current contribution interval is {value.interval}."
            )
        return value
