import logging

from django.conf import settings

from rest_framework import serializers

from apps.users.choices import Roles


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


MISSING_USER_IN_CONTEXT_MESSAGE = "Can't determine relationship of requesting user to request {} instance"


def _has_ensured_user_ownership_by_default(user, role_assignment):
    return any(
        [
            user.is_superuser,
            getattr(role_assignment, "role_type", None) == Roles.HUB_ADMIN,
        ]
    )


class ValidateFkReferenceOwnership:
    """Used to validate that a requesting user owns the requested resource

    ...where ownership is by virtue of user and role assignment instances.
    """

    requires_context = True

    def __init__(self, fk_attribute, has_default_access_fn=_has_ensured_user_ownership_by_default):
        """
        Notes on expectations around determine_ownership and has_default_access_fn
        """
        self.fk_attribute = fk_attribute
        self.has_default_access = has_default_access_fn
        # Validate passed function has at least the parameters that default fn has.
        if not set(_has_ensured_user_ownership_by_default.__code__.co_varnames).issubset(
            set(has_default_access_fn.__code__.co_varnames)
        ):
            logger.warning(
                "%s initialized with function whose signature is unexpected: %s(%s)",
                self.__class__,
                has_default_access_fn.__name__,
                has_default_access_fn.__code__.co_varnames,
            )
            raise serializers.ValidationError(f"{self.__class__} initialized with function with unexpected signature")

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

        instance = value.get(self.fk_attribute, None)
        if instance and not instance.user_has_ownership_via_role(ra):
            logger.warning(
                "User with role assignment [%s] attempted to access unowned resource: [%s]: [%s]",
                ra,
                instance.pk,
                instance,
            )
            raise serializers.ValidationError({self.fk_attribute: "Not found"})
