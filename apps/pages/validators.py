import logging

from django.conf import settings
from django.core.exceptions import ValidationError

from rest_framework import serializers

from apps.users.choices import Roles


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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

MISSING_USER_IN_CONTEXT_MESSAGE = "Can't determine relationship of requesting user to request {} instance"


def _has_ensured_user_ownership_by_default(user, role_assignment):
    return any(
        [
            user.is_superuser,
            getattr(role_assignment, "role_type", None) == Roles.HUB_ADMIN,
        ]
    )


class ValidateFkReferenceOwnership:
    """ """

    requires_context = True

    def _validate_passed_fn(self, fn, expected_params):
        if not set(expected_params).issubset(set(fn.__code__.co_varnames)):
            logger.warn("unexpected params")
            raise serializers.ValidationError("unexpected params")

    def __init__(self, fk_attribute, has_default_access_fn=_has_ensured_user_ownership_by_default):
        """
        Notes on expectations around determine_ownership and has_default_access_fn

        """
        EXPECTED_ACCESS_FN_PARAMS = (
            "user",
            "role_assignment",
        )

        self._validate_passed_fn(has_default_access_fn, EXPECTED_ACCESS_FN_PARAMS)

        self.has_default_access = has_default_access_fn
        self.fk_attribute = fk_attribute

    def __call__(self, value, serializer):
        """ """
        user = serializer.context.get("request").user
        if not user:
            logger.error("`ValidateFkReferenceOwnership` expected user in request context but there wasn't one")
            raise serializers.ValidationError(MISSING_USER_IN_CONTEXT_MESSAGE.format(serializer.model.__name__))
        ra = getattr(user, "roleassignment", None)

        if self.has_default_access(user, ra):
            return
        elif not ra:
            logger.error(
                "`ValidateFkReferenceOwnership` expected role assignmment in request context but there wasn't one"
            )
            raise serializers.ValidationError(MISSING_USER_IN_CONTEXT_MESSAGE.format(serializer.model.__name__))
        else:
            instance = value.get(self.fk_attribute, None)
            if instance is None:
                return
            if not instance.user_has_ownership_via_role(ra):
                logger.warn("accessing unowned")
                raise serializers.ValidationError("unowned")
