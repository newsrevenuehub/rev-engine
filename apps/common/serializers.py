from django.templatetags.static import static

from rest_framework import serializers

from apps.common.models import SocialMeta


class SocialMetaInlineSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    card = serializers.SerializerMethodField()
    twitter_handle = serializers.SerializerMethodField()
    revenue_program_name = serializers.SerializerMethodField()
    image_alt = serializers.SerializerMethodField()

    def get_title(self, obj):
        return obj.title if obj.title else f"Join | {obj.revenue_program.name}"

    def get_description(self, obj):
        return (
            obj.description
            if obj.description
            else f"{obj.revenue_program.name} is supported by people like you. Support {obj.revenue_program.name} today."
        )

    def get_url(self, obj):
        return obj.url if obj.url else "https://fundjournalism.org"

    def get_card(self, obj):
        request = self.context.get("request")
        site_url = f"{request.scheme}://{request.get_host()}"
        return obj.card.url if obj.card else site_url + static("hub-og-card.png")

    def get_twitter_handle(self, obj):
        return "@" + obj.revenue_program.twitter_handle if obj.revenue_program.twitter_handle else "@fundjournalism"

    def get_revenue_program_name(self, obj):
        return obj.revenue_program.name

    def get_image_alt(self, obj):
        return f"{obj.revenue_program.name} social media card" if obj.card else "fund journalism social media card"

    class Meta:
        model = SocialMeta
        fields = ["title", "description", "url", "card", "twitter_handle", "revenue_program_name", "image_alt"]
