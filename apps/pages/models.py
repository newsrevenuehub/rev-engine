from django.db import models
from django.utils import timezone

from rest_framework.exceptions import ValidationError
from safedelete.models import SafeDeleteModel
from simple_history.models import HistoricalRecords
from solo.models import SingletonModel
from sorl.thumbnail import ImageField as SorlImageField

from apps.api.error_messages import UNIQUE_PAGE_SLUG
from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import cleanup_keys, normalize_slug
from apps.config.validators import validate_slug_against_denylist
from apps.organizations.models import Feature, RevenueProgram
from apps.pages import defaults
from apps.pages.validators import style_validator
from apps.users.choices import Roles
from apps.users.models import RoleAssignmentResourceModelMixin, UnexpectedRoleType


def _get_screenshot_upload_path(instance, filename):
    return f"{instance.organization.name}/page_screenshots/{instance.name}_latest.png"


class AbstractPage(IndexedTimeStampedModel, RoleAssignmentResourceModelMixin):
    name = models.CharField(max_length=255)
    heading = models.CharField(max_length=255, blank=True)

    graphic = SorlImageField(null=True, blank=True)

    header_bg_image = SorlImageField(null=True, blank=True)
    # header_logo should default to None. Elsewhere, None means use default image while blank means no image.
    header_logo = SorlImageField(null=True, blank=True, default=None)
    header_link = models.URLField(blank=True)

    sidebar_elements = models.JSONField(null=True, blank=True, default=list)

    styles = models.ForeignKey("pages.Style", null=True, blank=True, on_delete=models.SET_NULL)

    thank_you_redirect = models.URLField(
        blank=True, help_text="If not using default Thank You page, add link to orgs Thank You page here"
    )
    post_thank_you_redirect = models.URLField(
        blank=True,
        help_text='Donors can click a link to go "back to the news" after viewing the default thank you page',
    )

    revenue_program = models.ForeignKey(
        "organizations.RevenueProgram",
        null=True,
        on_delete=models.SET_NULL,
    )

    @property
    def organization(self):
        if self.revenue_program:
            return self.revenue_program.organization

    @classmethod
    def field_names(cls):
        return [f.name for f in cls._meta.fields]

    @classmethod
    def filter_queryset_by_role_assignment(cls, role_assignment, queryset):
        if role_assignment.role_type == Roles.HUB_ADMIN:
            return queryset.all()
        elif role_assignment.role_type == Roles.ORG_ADMIN:
            return queryset.filter(revenue_program__organization=role_assignment.organization).all()
        elif role_assignment.role_type == Roles.RP_ADMIN:
            return queryset.filter(revenue_program__in=role_assignment.revenue_programs.all()).all()
        else:
            raise UnexpectedRoleType(f"{role_assignment.role_type} is not a valid value")

    class Meta:
        abstract = True


class Template(AbstractPage):
    """
    A "Snapshot" of a Page at a particular state.
    """

    # 'elements' is special. It has a default value when on a DonationPage
    # but should not have a default as a Template
    elements = models.JSONField(null=True, blank=True, default=list)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    class TemplateError(Exception):
        pass

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "revenue_program",
        )

    def make_page_from_template(self, page_data={}):
        """
        Create a page from from template.
        Expects template_data as dict, and optional page_data (eg. for creating a template page via org admin).
        We also clean up template and page data here, so that we only copy the fields we want.
        """
        template_data = self.__dict__
        template_data["name"] = f"New Page From Template ({template_data['name']})"
        template_data["slug"] = normalize_slug(name=template_data["name"])

        unwanted_keys = ["_state", "id", "modified", "created", "published_date", "_history_user"]
        template = cleanup_keys(template_data, unwanted_keys)
        page = cleanup_keys(page_data, unwanted_keys)
        return DonationPage.objects.create(**{**template, **page})


class DonationPage(AbstractPage, SafeDeleteModel):
    """
    A DonationPage represents a single instance of a Donation Page.
    """

    # 'elements' is special. It has a default value when on a DonationPage
    # but should not have a default as a Template
    elements = models.JSONField(null=True, blank=True, default=defaults.get_default_page_elements)

    slug = models.SlugField(
        blank=True,
        help_text="If not entered, it will be built from the Page name",
        error_messages={"unique": UNIQUE_PAGE_SLUG},
        validators=[validate_slug_against_denylist],
    )

    published_date = models.DateTimeField(null=True, blank=True)
    page_screenshot = SorlImageField(null=True, blank=True, upload_to=_get_screenshot_upload_path)

    email_templates = models.ManyToManyField("emails.PageEmailTemplate", blank=True)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    class Meta:
        unique_together = (
            "slug",
            "revenue_program",
        )

    def __str__(self):
        return self.name

    def has_page_limit(self):
        return Feature.objects.filter(
            feature_type=Feature.FeatureType.PAGE_LIMIT, plans__organization=self.organization.id
        ).first()

    def update_email_template(self, template):
        """
        Replaces the template on the DonationPage instance with a new template with the same.
        template type.

        :param template: PageEmailTemplate instance
        :return: None
        """
        if temp := self.email_templates.filter(template_type=template.template_type).first():
            self.email_templates.remove(temp)
            self.email_templates.add(template)
        else:
            self.email_templates.add(template)

    def get_total_org_pages(self):
        org = self.revenue_program.organization
        return DonationPage.objects.filter(revenue_program__in=org.revenueprogram_set.all()).count()

    @property
    def is_live(self):
        return bool(self.published_date and self.published_date <= timezone.now())

    def set_default_logo(self):
        """
        If this is the first time this model is being created (not self.pk),
        there isn't a header_logo value, and there is a DefaultPageLogo set up,
        use DefaultPageLogo.logo as self.header_logo
        """
        default_logo = DefaultPageLogo.get_solo()
        if not self.pk and not self.header_logo and default_logo.logo:
            self.header_logo = default_logo.logo

    def clean_fields(self, **kwargs):
        self.slug = normalize_slug(self.name, self.slug)
        super().clean_fields(**kwargs)

    def save(self, *args, **kwargs):
        limit = self.has_page_limit()
        if limit and not self.id and self.get_total_org_pages() + 1 > int(limit.feature_value):
            raise ValidationError(
                {"non_field_errors": [f"Your organization has reached its limit of {limit.feature_value} pages"]}
            )

        self.set_default_logo()

        super().save(*args, **kwargs)

    def make_template_from_page(self, template_data={}):
        unwanted_keys = [
            "_state",
            "id",
            "created",
            "modified",
            "slug",
            "page_screenshot",
            "deleted",
            "published_date",
        ]
        page = cleanup_keys(self.__dict__, unwanted_keys)
        template = cleanup_keys(template_data, unwanted_keys)
        merged = {**page, **template}
        merged["revenue_program"] = RevenueProgram.objects.get(pk=merged.pop("revenue_program_id"))
        return Template.objects.create(**merged)


class Style(IndexedTimeStampedModel, SafeDeleteModel):
    """
    Ties a set of styles to a page. Discoverable by name, belonging to a RevenueProgram.
    """

    name = models.CharField(max_length=50)
    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    styles = models.JSONField(validators=[style_validator])

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "revenue_program",
        )

        ordering = ["-created", "name"]


class Font(models.Model):
    class FontSourceChoices(models.TextChoices):
        TYPEKIT = "typekit", "Typekit"
        GOOGLE_FONTS = "google", "Google fonts"

    name = models.CharField(
        max_length=255, unique=True, help_text="This is how the font will be displayed in the Org admin"
    )
    source = models.CharField(max_length=7, choices=FontSourceChoices.choices)
    font_name = models.CharField(
        max_length=255, unique=True, help_text="This is the name by which CSS will use the font"
    )
    accessor = models.CharField(
        max_length=255,
        help_text="For typekit fonts, use the kitId. For google fonts, use the value of the 'family' query param",
    )

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.name} ({self.source})"

    class Meta:
        ordering = [models.functions.Lower("name")]


class DefaultPageLogo(SingletonModel):
    logo = SorlImageField(null=True)

    def __str__(self):
        return "Default Page Logo"
