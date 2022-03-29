from django.core.exceptions import ValidationError

from rest_framework import serializers

from apps.users.choices import Roles


required_style_keys = {"radii": list, "font": dict, "fontSizes": list}


UNOWNED_TEMPLATE_FROM_PAGE_PAGE_PK_MESSAGE = "You don't own the page you're trying to make a template from"


def style_validator(value):
    errors = []
    for key, valType in required_style_keys.items():
        if key not in value or type(value[key]) != valType:
            errors.append(ValidationError(f'Style objects must contain a "{key}" key of type "{valType}"'))
    if errors:
        raise ValidationError(errors)


class PagePkIsForOwnedPage:
    requires_context = True

    def __init__(self, page_model):
        self.page_model = page_model

    def __call__(self, value, serializer):
        target_page = self.page_model.objects.get(pk=value["page_pk"])
        user = serializer.context["request"].user
        ra = getattr(user, "roleassignment", None)
        if user.is_superuser or (ra is not None and ra.role_type == Roles.HUB_ADMIN):
            return
        elif ra.role_type == Roles.ORG_ADMIN and target_page.revenue_program.organization != ra.organization:
            raise serializers.ValidationError(UNOWNED_TEMPLATE_FROM_PAGE_PAGE_PK_MESSAGE)
        elif ra.role_type == Roles.RP_ADMIN and target_page.revenue_program not in ra.revenue_programs.all():
            raise serializers.ValidationError(UNOWNED_TEMPLATE_FROM_PAGE_PAGE_PK_MESSAGE)
