from rest_framework import serializers

from apps.common.models import SocialMeta


class SocialMetaInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialMeta
        fields = [
            "title",
            "description",
            "url",
            "card",
        ]
