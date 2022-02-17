from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import ugettext_lazy as _

from apps.common.models import IndexedTimeStampedModel
from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, IndexedTimeStampedModel):
    email = models.EmailField(max_length=255, unique=True)
    is_staff = models.BooleanField(
        default=False,
        help_text=_("Designates whether the user can log into this admin site."),
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_(
            "Designates whether this user should be treated as " "active. Unselect this instead of deleting accounts."
        ),
    )

    organizations = models.ManyToManyField("organizations.Organization", through="users.OrganizationUser")

    objects = UserManager()

    USERNAME_FIELD = "email"

    def get_full_name(self):
        return self.email

    def get_short_name(self):
        return self.email

    def get_organization(self):
        """
        We don't currently support users belonging to multiple orgs,
        so for now, just grab the one-and-only org in their set.
        """
        return self.organization_set.first()

    def get_revenue_programs(self):
        """
        Return queryset of revenue programs this user has permission to access
        """
        organization = self.get_organization()
        return organization.revenueprogram_set.all() if organization else None

    def __str__(self):
        return self.email


class OrganizationUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    is_owner = models.BooleanField(default=False)


class Roles(models.TextChoices):
    HUB_ADMIN = "hub_admin", "Hub Admin"
    ORG_ADMIN = "org_admin", "Org Admin"
    RP_ADMIN = "rp_admin", "RP Admin"


class RoleAssignment(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role_type = models.CharField(max_length=max(len(x) for x in Roles.values), choices=Roles.choices)
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
