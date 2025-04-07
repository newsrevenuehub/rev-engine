from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from apps.common.admin import RevEngineBaseAdmin
from apps.users.forms import RoleAssignmentAdminForm
from apps.users.models import RoleAssignment, User


@admin.register(User)
class CustomUserAdmin(RevEngineBaseAdmin, UserAdmin):
    list_display = ("email", "is_superuser", "is_staff", "role_assignment", "last_login")
    list_filter = ("is_active", "is_staff", "groups")
    search_fields = ("email",)
    ordering = ("email",)
    filter_horizontal = (
        "groups",
        "user_permissions",
    )

    def role_assignment(self, obj):
        return str(obj.get_role_assignment())

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "last_login",
                    "email",
                    "password",
                    "first_name",
                    "last_name",
                    "job_title",
                    "email_verified",
                    "accepted_terms_of_service",
                )
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "roleassignment",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "email_verified", "accepted_terms_of_service"),
            },
        ),
    )

    readonly_fields = ("roleassignment", "last_login")


@admin.register(RoleAssignment)
class RoleAssignmentAdmin(RevEngineBaseAdmin):
    list_display = (
        "user",
        "role_type",
        "organization",
    )

    #
    form = RoleAssignmentAdminForm
    change_form_template = "users/roleassignment_changeform.html"

    def get_readonly_fields(self, request, obj=None):
        # User is readonly on changeform
        if obj:
            return ["user"]
        return []

    def get_form(self, request, obj, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        # For the user field, only show users that do not already have a Role Assignment
        if user_field := form.base_fields.get("user"):
            user_field.limit_choices_to = Q(roleassignment__isnull=True)

        # Alphabetize the organization list
        if org_field := form.base_fields.get("organization"):
            org_field.queryset = org_field.queryset.order_by("name")

        # Do not allow inline create/update/delete for these relations
        immutable_relations = (
            "organization",
            "revenue_programs",
        )
        for rel in immutable_relations:
            form.base_fields[rel].widget.can_change_related = False
            form.base_fields[rel].widget.can_delete_related = False
            form.base_fields[rel].widget.can_add_related = False

        return form
