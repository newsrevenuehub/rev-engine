from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.common.models import IndexedTimeStampedModel
from apps.common.utils import normalize_slug
from apps.organizations.models import Feature


class AbstractPage(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)

    header_bg_image = models.ImageField(null=True, blank=True)
    header_logo = models.ImageField(null=True, blank=True)
    header_link = models.URLField(null=True, blank=True)

    styles = models.ForeignKey("pages.Style", null=True, blank=True, on_delete=models.SET_NULL)

    elements = models.JSONField(null=True, blank=True)

    show_benefits = models.BooleanField(default=False)

    donor_benefits = models.ForeignKey(
        "pages.DonorBenefit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    # lookup with org.donationpages / org.templates
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

        page.save()
        return page_model.objects.get(pk=page.pk)


class DonationPage(AbstractPage):
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

    class Meta:
        unique_together = (
            "slug",
            "revenue_program",
        )

    def __str__(self):
        return f"{self.title} - {self.slug}"

    def has_page_limit(self):
        return Feature.objects.filter(
            feature_type=Feature.FeatureType.PAGE_LIMIT, plans__organization=self.organization.id
        ).first()

    @property
    def total_pages(self):
        return DonationPage.objects.filter(organization=self.organization).count()

    @property
    def is_live(self):
        return bool(self.published_date and self.published_date <= timezone.now())

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

        template.name = name or self.title

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


class DonorBenefit(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    blurb = models.TextField(blank=True)
    tiers = models.ManyToManyField("pages.BenefitTier")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )


class BenefitTier(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    benefits = models.ManyToManyField("pages.Benefit")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Benefit(IndexedTimeStampedModel):
    name = models.CharField(max_length=255)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )
