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

    def __str__(self):
        return self.email


class OrganizationUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    is_owner = models.BooleanField(default=False)
