import logging
from enum import Enum

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from waffle import get_waffle_flag_model

from apps.common.models import IndexedTimeStampedModel
from apps.users.managers import UserManager

from .choices import Roles
from .constants import FIRST_NAME_MAX_LENGTH, JOB_TITLE_MAX_LENGTH, LAST_NAME_MAX_LENGTH


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class RoleTypeReturnValues(Enum):
    HUB_ADMIN = "hub_admin", "Hub Admin"
    ORG_ADMIN = "org_admin", "Org Admin"
    RP_ADMIN = "rp_admin", "RP Admin"
    SUPERUSER = "superuser", "Superuser"


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
    # TODO @DC: Remove this field as part of the DEV-3913 ticket
    # DEV-3913
    organizations = models.ManyToManyField("organizations.Organization", through="users.OrganizationUser")
    accepted_terms_of_service = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    first_name = models.CharField(max_length=FIRST_NAME_MAX_LENGTH, blank=True, null=True)
    last_name = models.CharField(max_length=LAST_NAME_MAX_LENGTH, blank=True, null=True)
    job_title = models.CharField(max_length=JOB_TITLE_MAX_LENGTH, blank=True, null=True)

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

    @property
    def role_type(self) -> RoleTypeReturnValues:
        if self.is_superuser:
            return ("superuser", "Superuser")
        ra = self.get_role_assignment()
        return (ra.role_type, ra.get_role_type_display()) if ra else None

    def validate_unique(self, exclude: set) -> None:
        # we sidestep default unique validation for the email field
        val = getattr(self, self.USERNAME_FIELD)
        logger.info(
            "User.validate_unique called for user with ID %s and %s value %s", self.pk, self.USERNAME_FIELD, val
        )
        exclude.add(self.USERNAME_FIELD)
        super().validate_unique(exclude)
        _user = None
        try:
            _user = User.objects.get_by_natural_key(val)
        except User.DoesNotExist:
            return
        if _user and (self.pk is None or _user.pk != self.pk):
            logger.info(
                "User.validate_unique found a duplicate user with ID %s for %s %s", _user.pk, self.USERNAME_FIELD, val
            )
            raise ValidationError("User with this Email already exists.", code="unique_together")

    @property
    def active_flags(self) -> models.QuerySet:
        """Return set of distinct flags this user gets by virtue of their role, role assignment, or lack thereof."""
        Flag = get_waffle_flag_model()
        return (
            Flag.objects.filter(models.Q(superusers=True) | models.Q(everyone=True) | models.Q(users__in=[self]))
            if self.is_superuser
            else Flag.objects.filter(models.Q(everyone=True) | models.Q(users__in=[self]))
        )

    @property
    def permitted_organizations(
        self,
    ) -> models.QuerySet["organizations.Organization"]:
        """All the orgs a user is permitted to see based on being a superuser or else on their role assignment, if any."""
        from apps.organizations.models import Organization  # noqa: PLC0415

        if self.is_superuser:
            return Organization.objects.all()
        try:
            ra = self.roleassignment
        except RoleAssignment.DoesNotExist:
            return Organization.objects.none()

        if ra.role_type == Roles.HUB_ADMIN:
            return Organization.objects.all()

        return Organization.objects.filter(id=ra.organization.id)

    @property
    def permitted_revenue_programs(self) -> models.QuerySet["organizations.RevenueProgram"]:
        """All the revenue programs a user is permitted to see based on being a superuser or else on their role assignment, if any."""
        from apps.organizations.models import RevenueProgram  # noqa: PLC0415

        if self.is_superuser:
            return RevenueProgram.objects.all()
        try:
            ra = self.roleassignment
        except RoleAssignment.DoesNotExist:
            return RevenueProgram.objects.none()
        if ra.role_type == Roles.HUB_ADMIN:
            return RevenueProgram.objects.all()
        if ra.role_type == Roles.ORG_ADMIN:
            return ra.organization.revenueprogram_set.all()
        return ra.revenue_programs.all()

    def __str__(self):
        return self.email


class OrganizationUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    is_owner = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.organization} - {self.user}"


class RoleAssignment(models.Model):
    """The central entity used for determining view and object-level permissions accross the API layer.

    API resources use role assignnments to do things like limit queryset results to only objects owned by
    a user's organization (for instance).
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="roleassignment")
    role_type = models.CharField(max_length=50, choices=Roles.choices)
    organization = models.ForeignKey("organizations.Organization", null=True, blank=True, on_delete=models.CASCADE)
    revenue_programs = models.ManyToManyField("organizations.RevenueProgram", blank=True)

    def __str__(self):
        if self.role_type == Roles.HUB_ADMIN:
            return Roles.HUB_ADMIN.label
        if self.role_type == Roles.ORG_ADMIN:
            return f"{Roles.ORG_ADMIN.label} for {self.organization.name}"
        if self.role_type == Roles.RP_ADMIN:
            owned_rps_as_strings = [f"`#{rp.pk}: {rp.name}`" for rp in self.revenue_programs.all()]
            return f"{Roles.RP_ADMIN.label} for these revenue programs: {', '.join(owned_rps_as_strings)}"
        return f"Unspecified RoleAssignment ({self.pk})"

    # TODO @BW: Use user.permitted_organizations, user.permitted_revenue_programs, user.active_flags wherever possible
    # DEV-4082
    def can_access_rp(self, revenue_program):
        """Determine if role assignment grants basic acess to a given revenue program.

        Note that this is a "dumb" notion of having access. It doesn't distinguish between
        read and write. It's used to show that a user should be able to
        have access to an rp by virtue of their role type, orgnaization, and revenue_programs.
        """
        return any(
            [
                self.user.is_superuser,
                self.role_type == Roles.HUB_ADMIN,
                self.role_type == Roles.ORG_ADMIN and self.organization == revenue_program.organization,
                self.role_type == Roles.RP_ADMIN and revenue_program in self.revenue_programs.all(),
            ]
        )


class UnexpectedRoleType(Exception):
    """For signalling an unexpected value for `role_assignment.role_type`."""
