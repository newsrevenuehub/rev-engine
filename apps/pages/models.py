from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from safedelete.models import SafeDeleteModel
from sorl.thumbnail import ImageField as SorlImageField

from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug
from apps.organizations.models import Feature


def _get_screenshot_upload_path(instance, filename):
    return f"{instance.organization.name}/page_screenshots/{instance.name}_latest.png"


class AbstractPage(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    heading = models.CharField(max_length=255, blank=True)

    graphic = SorlImageField(null=True, blank=True)

    header_bg_image = SorlImageField(null=True, blank=True)
    header_logo = SorlImageField(null=True, blank=True)
    header_link = models.URLField(null=True, blank=True)

    styles = models.ForeignKey("pages.Style", null=True, blank=True, on_delete=models.SET_NULL)

    elements = models.JSONField(null=True, blank=True, default=list)
    sidebar_elements = models.JSONField(null=True, blank=True, default=list)

    thank_you_redirect = models.URLField(
        blank=True, help_text="If not using default Thank You page, add link to orgs Thank You page here"
    )
    post_thank_you_redirect = models.URLField(
        blank=True,
        help_text='Donors can click a link to go "back to the news" after viewing the default thank you page',
    )

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    @classmethod
    def field_names(cls):
        return [f.name for f in cls._meta.fields]

    class Meta:
        abstract = True


class Template(AbstractPage):
    """
    A "Snapshot" of a Page at a particular state.
    """

    class TemplateError(Exception):
        pass

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )

    def make_page_from_template(self):
        page_model = apps.get_model("pages", "DonationPage")
        page = page_model()
        for field in AbstractPage.field_names():
            template_field = getattr(self, field)
            setattr(page, field, template_field)
        if parent_page := DonationPage.objects.filter(name=self.name).first():
            page.name = f"{page.name}-(COPY)"
            page.revenue_program = parent_page.revenue_program
            page.save()
            return page_model.objects.get(pk=page.pk)
        raise self.TemplateError(f"A DonationPage with the heading ({self.heading}) could not be found.")


class DonationPage(AbstractPage, SafeDeleteModel):
    """
    A DonationPage represents a single instance of a Donation Page.
    """

    slug = models.SlugField(unique=True, blank=True, help_text="If not entered, it will be built from the Page name")
    revenue_program = models.ForeignKey(
        "organizations.RevenueProgram",
        null=True,
        on_delete=models.SET_NULL,
    )
    published_date = models.DateTimeField(null=True, blank=True)
    page_screenshot = SorlImageField(null=True, blank=True, upload_to=_get_screenshot_upload_path)

    email_templates = models.ManyToManyField("emails.PageEmailTemplate", blank=True)

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

    @property
    def total_pages(self):
        return DonationPage.objects.filter(organization=self.organization).count()

    @property
    def is_live(self):
        return bool(self.published_date and self.published_date <= timezone.now())

    @property
    def derived_slug(self):
        return f"{self.revenue_program.slug}/{self.slug}"

    def save(self, *args, **kwargs):
        limit = self.has_page_limit()
        if limit and not self.id:
            if self.total_pages + 1 > int(limit.feature_value):
                raise ValidationError(f"Your organization has reached its limit of {limit.feature_value} pages")

        self.slug = normalize_slug(self.name, self.slug)

        super().save(*args, **kwargs)

    def save_as_template(self, name=None):
        template = Template()
        for field in AbstractPage.field_names():
            page_field = getattr(self, field)
            setattr(template, field, page_field)

        template.name = name or self.name

        template_exists = Template.objects.filter(name=template.name).exists()
        created = False

        if not template_exists:
            template.save()
            created = True

        instance = Template.objects.filter(name=template.name).first()

        return (instance, created)


class Style(IndexedTimeStampedModel):
    """
    Ties a set of styles to a page. Discoverable by name, belonging to an Organization.
    """

    name = models.CharField(max_length=255)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    styles = models.JSONField()

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )
