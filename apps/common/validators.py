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

    def _validate_passed_fn(self, fn, expected_params):
        """Used to validate that a passed function has expected parameters

        ...since callers can choose to pass a `has_default_access_fn` to replace
        the default one.
        """
        if not set(expected_params).issubset(set(fn.__code__.co_varnames)):
            logger.warn("`ValidateFkReferenceOwnership` initialized with  ")
            raise serializers.ValidationError("Somethin")

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
                logger.warn(
                    f"User with role assignment ${ra} attempted to access unowned resource: {instance.pk}: {instance}"
                )
                raise serializers.ValidationError({self.fk_attribute: "Not found"})
