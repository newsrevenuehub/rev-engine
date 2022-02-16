from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import Q
from django.utils.translation import ugettext_lazy as _

from apps.organizations.models import Organization
from apps.users.models import RoleAssignment, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("id", "email", "created", "modified")
    list_filter = ("is_active", "is_staff", "groups")
    search_fields = ("email",)
    ordering = ("email",)
    filter_horizontal = (
        "groups",
        "user_permissions",
    )

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    # "groups",
                    # "user_permissions",
                    "roleassignment",
                )
            },
        ),
    )

    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)

    readonly_fields = ("roleassignment",)


class UserOrganizationInline(admin.TabularInline):
    model = Organization.users.through


@admin.register(RoleAssignment)
class RoleAssignment(admin.ModelAdmin):
    list_display = (
        "user",
        "role_type",
        "organization",
    )

    change_form_template = "users/roleassignment_changeform.html"

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ["user"]
        return []

    def get_form(self, request, obj, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if user_field := form.base_fields.get("user"):
            user_field.limit_choices_to = Q(roleassignment__isnull=True)
        return form
