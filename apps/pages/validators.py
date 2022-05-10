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
    """Used in serializer to ensure that the id supplied for `page_pk` is for a permitted resource"""

    requires_context = True

    def __init__(self, page_model):
        self.page_model = page_model

    def __call__(self, value, serializer):
        """Get the instance referred to by `page_pk`...

        ...if user is superuser or hub admin, valid
        ...if user is an org admin, valid if referenced page belongs to org
        ...if user is rp admin, valid if referenced page belongs to their rp
        """
        target_page = self.page_model.objects.get(pk=value["page_pk"])
        if (request := serializer.context.get("request", None)) is not None:
            user = request.user
            ra = getattr(user, "roleassignment", None)
            if user.is_superuser or (ra is not None and ra.role_type == Roles.HUB_ADMIN):
                return
            elif ra.role_type == Roles.ORG_ADMIN and target_page.revenue_program.organization != ra.organization:
                raise serializers.ValidationError(UNOWNED_TEMPLATE_FROM_PAGE_PAGE_PK_MESSAGE)
            elif ra.role_type == Roles.RP_ADMIN and target_page.revenue_program not in ra.revenue_programs.all():
                raise serializers.ValidationError(UNOWNED_TEMPLATE_FROM_PAGE_PAGE_PK_MESSAGE)


UNOWNED_REVENUE_PROGRAM_PK_MESSAGE = "You aren't permitted to reference this revenue program"
MISSING_REFRENCE_TO_REV_PROGRAM_MESSAGE = "Can't determine relationship with revenue program"


class RpPkIsForOwnedRp:
    """Used in serializer to ensure that the id supplied for `revenue_program_pk` is for a permitted resource"""

    requires_context = True

    def __init__(self, rp_model):
        self.rp_model = rp_model

    def __call__(self, value, serializer):
        """Get the instance referred to by `revenue_program_pk`...

        ...if user is superuser or hub admin, valid
        ...if user is an org admin, valid if referenced rp belongs to org
        ...if user is rp admin, valid if referenced page belongs is one of their rps
        """
        method = serializer.context["request"].method
        if method in ["POST", "PATCH"]:
            target_rp = None
            if method == "POST":
                target_rp = value.get("revenue_program")

            if method == "PATCH":
                # rp_pk can be updated via patch, but default to existing otherwise
                target_rp = value.get("revenue_program", serializer.instance.revenue_program)
            if not target_rp:
                raise serializers.ValidationError(MISSING_REFRENCE_TO_REV_PROGRAM_MESSAGE)
            if (request := serializer.context.get("request", None)) is not None:
                user = request.user
                ra = getattr(user, "roleassignment", None)
                if user.is_superuser or (ra is not None and ra.role_type == Roles.HUB_ADMIN):
                    return
                elif ra.role_type == Roles.ORG_ADMIN and target_rp.organization != ra.organization:
                    raise serializers.ValidationError(UNOWNED_REVENUE_PROGRAM_PK_MESSAGE)
                elif ra.role_type == Roles.RP_ADMIN and target_rp not in ra.revenue_programs.all():
                    raise serializers.ValidationError(UNOWNED_REVENUE_PROGRAM_PK_MESSAGE)
        return
