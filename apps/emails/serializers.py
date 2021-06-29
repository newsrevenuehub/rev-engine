from rest_framework import serializers

from apps.emails.models import PageEmailTemplate


class PageEmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageEmailTemplate
        fields = [
            "id",
            "identifier",
            "template_type",
            "schema",
            "donation_page",
        ]
