from rest_framework import serializers

from apps.emails.models import EmailCustomization


class EmailCustomizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailCustomization
        fields = [
            "idrevenue_program",
            "email_type",
            "email_block",
            "content_html",
            "content_plain_text",
        ]

        read_only_fields = ["id", "content_plain_text"]
