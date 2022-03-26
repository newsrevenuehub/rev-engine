from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import ugettext_lazy as _

from apps.common.models import IndexedTimeStampedModel
from apps.users.managers import UserManager

from .choices import Roles


class User(AbstractBaseUser, PermissionsMixin, IndexedTimeStampedModel):
    email = models.EmailField(max_length=255, unique=True)
    is_staff = models.BooleanField(
        default=False,
        help_text=_("Designates whether the user can log into this admin site."),
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_(
            "Designates whether this user should be treated as active. Unselect this instead of deleting accounts."
        ),
    )

    organizations = models.ManyToManyField("organizations.Organization", through="users.OrganizationUser")

    objects = UserManager()

    USERNAME_FIELD = "email"

    def get_full_name(self):
        return self.email

    def get_short_name(self):
        return self.email

    def get_role_assignment(self):
        try:
            return self.roleassignment
        except self.__class__.roleassignment.RelatedObjectDoesNotExist:
            return None

    def __str__(self):
        return self.email


class OrganizationUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    is_owner = models.BooleanField(default=False)


class RoleAssignment(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role_type = models.CharField(max_length=50, choices=Roles.choices)
    organization = models.ForeignKey("organizations.Organization", null=True, blank=True, on_delete=models.SET_NULL)
    revenue_programs = models.ManyToManyField("organizations.RevenueProgram", blank=True)

    def __str__(self):
        if self.role_type == Roles.HUB_ADMIN:
            return Roles.HUB_ADMIN.label
        if self.role_type == Roles.ORG_ADMIN:
            return f"{Roles.ORG_ADMIN.label} for {self.organization.name}"
        if self.role_type == Roles.RP_ADMIN:
            return f"{Roles.RP_ADMIN.label} for {self.organization.name}"
        return f"Unspecified RoleAssignment ({self.pk})"


class UnexpectedRoleType(Exception):
    pass


class RoleAssignmentResourceModelMixin:
    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        raise NotImplementedError

    @classmethod
    def filter_queryset_for_contributor(cls, contributor, queryset):
        raise NotImplementedError

    @classmethod
    def user_has_create_permission_by_virtue_of_role(
        cls,
        user,
        org_slug,
        rp_slug,
    ):
        raise NotImplementedError

    @classmethod
    def user_has_delete_permission_by_virtue_of_role(cls, user, obj):
        raise NotImplementedError
