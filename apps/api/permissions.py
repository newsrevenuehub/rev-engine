from rest_framework import permissions


class UserBelongsToOrg(permissions.BasePermission):
    """
    Object-level permission to only allow access to users associated with
    an Organization that owns the resrouce.
    """

    message = "User does not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        # check if obj has an organization attached
        if not hasattr(obj, "organization"):
            return True

        return request.user.is_active and obj.organization.user_is_member(request.user)
