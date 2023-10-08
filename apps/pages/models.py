import datetime
import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from solo.models import SingletonModel
from sorl.thumbnail import ImageField as SorlImageField

from apps.common.models import IndexedTimeStampedModel
from apps.config.validators import validate_slug_against_denylist
from apps.pages import defaults, signals
from apps.pages.validators import style_validator
from apps.users.choices import Roles
from apps.users.models import RoleAssignment


PAGE_NAME_MAX_LENGTH = PAGE_HEADING_MAX_LENGTH = 255


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def _get_screenshot_upload_path(instance, filename):
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{instance.organization.name}/page_screenshots/{instance.name}_{timestamp}.png"


class PagesAppQuerySet(models.QuerySet):
    def filtered_by_role_assignment(self, role_assignment: RoleAssignment) -> models.QuerySet:
        match role_assignment.role_type:
            case Roles.HUB_ADMIN:
                return self.all()
            case Roles.ORG_ADMIN:
                return self.filter(revenue_program__organization=role_assignment.organization)
            case Roles.RP_ADMIN:
                return self.filter(revenue_program__in=role_assignment.revenue_programs.all())
            case _:
                return self.none()


class PagesAppManager(models.Manager):
    pass


class DonationPage(IndexedTimeStampedModel):
    """
    A DonationPage represents a single instance of a Donation Page.
    """

    elements = models.JSONField(null=True, blank=True, default=defaults.get_default_page_elements)
    graphic = SorlImageField(null=True, blank=True)
    header_bg_image = SorlImageField(null=True, blank=True)
    header_link = models.URLField(blank=True)
    header_logo = SorlImageField(null=True, blank=True, default=None)
    header_logo_alt_text = models.CharField(max_length=255, blank=True, default="")
    heading = models.CharField(max_length=PAGE_HEADING_MAX_LENGTH, blank=True)
    name = models.CharField(max_length=PAGE_NAME_MAX_LENGTH)
    locale = models.CharField(max_length=20, default="en")
    page_screenshot = SorlImageField(null=True, blank=True, upload_to=_get_screenshot_upload_path)
    post_thank_you_redirect = models.URLField(
        blank=True,
        help_text='Contributors can click a link to go "back to the news" after viewing the default thank you page',
    )
    published_date = models.DateTimeField(null=True, blank=True)
    revenue_program = models.ForeignKey(
        "organizations.RevenueProgram",
        null=True,
        on_delete=models.CASCADE,
    )
    sidebar_elements = models.JSONField(default=list, blank=True)
    slug = models.SlugField(
        blank=True,
        validators=[validate_slug_against_denylist],
        null=True,
    )
    styles = models.ForeignKey("pages.Style", null=True, blank=True, on_delete=models.SET_NULL)
    thank_you_redirect = models.URLField(
        blank=True, help_text="If not using default Thank You page, add link to orgs Thank You page here"
    )

    objects = PagesAppManager.from_queryset(PagesAppQuerySet)()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["revenue_program", "name"], name="unique_name"),
            models.UniqueConstraint(
                fields=["revenue_program", "slug"], name="unique_slug", condition=models.Q(slug__isnull=False)
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def organization(self):
        if self.revenue_program:
            return self.revenue_program.organization

    @classmethod
    def field_names(cls):
        return [f.name for f in cls._meta.fields]

    @property
    def is_live(self):
        return bool(self.published_date and self.published_date <= timezone.now())

    @property
    def page_url(self) -> str:
        http_scheme = "https://"
        return f"{http_scheme}{self.revenue_program.slug}.{settings.SITE_URL.partition(http_scheme)[2]}/{self.slug}"

    def set_default_logo(self):
        """
        If this is the first time this model is being created (not self.pk),
        there isn't a header_logo value, and there is a DefaultPageLogo set up,
        use DefaultPageLogo.logo as self.header_logo
        """
        default_logo = DefaultPageLogo.get_solo()
        if not self.pk and not self.header_logo and default_logo.logo:
            self.header_logo = default_logo.logo

    def save(self, *args, **kwargs):
        # should_send_first_publication_signal has to be called prior to saving the record
        # to allow us to compare in flight record with record in database
        should_send_first_publication_signal = self.should_send_first_publication_signal()
        self.set_default_logo()
        super().save(*args, **kwargs)
        if should_send_first_publication_signal:
            logger.info("DonationPage.save - sending signal page_published for page %s", self.id)
            signals.page_published.send(sender=self.__class__, instance=self)

    def should_send_first_publication_signal(self) -> bool:
        if not self.published_date:
            return False
        elif not self.id:
            return True
        else:
            existing_page = DonationPage.objects.get(pk=self.pk)
            return True if not existing_page.published_date else False


class Style(IndexedTimeStampedModel):
    """
    Ties a set of styles to a page. Discoverable by name, belonging to a RevenueProgram.
    """

    name = models.CharField(max_length=50)
    revenue_program = models.ForeignKey("organizations.RevenueProgram", on_delete=models.CASCADE)
    styles = models.JSONField(validators=[style_validator])

    objects = PagesAppManager.from_queryset(PagesAppQuerySet)()

    class Meta:
        unique_together = (
            "name",
            "revenue_program",
        )

        ordering = ["-created", "name"]

    def __str__(self):
        return self.name


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

    class Meta:
        ordering = [models.functions.Lower("name")]

    def __str__(self):
        return f"{self.name} ({self.source})"


class DefaultPageLogo(SingletonModel):
    logo = SorlImageField(null=True)

    def __str__(self):
        return "Default Page Logo"
