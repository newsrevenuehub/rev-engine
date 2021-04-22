from datetime import datetime

from django.db import models


class AbstractPage(models.Model):
    header_bg_image = models.ImageField(null=True, blank=True)
    header_logo = models.ImageField(null=True, blank=True)
    header_link = models.URLField(null=True, blank=True)

    title = models.CharField(max_length=255)

    styles = models.ForeignKey("pages.Style", null=True, blank=True, on_delete=models.SET_NULL)

    elements = models.JSONField(null=True, blank=True)

    show_benefits = models.BooleanField(default=False)

    donor_benefits = models.ForeignKey(
        "pages.DonorBenefit", null=True, blank=True, on_delete=models.SET_NULL
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

    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )


class Page(AbstractPage):
    """
    A Page represents a single instance of a Donation Page.
    """

    slug = models.SlugField(unique=True)

    revenue_program = models.ForeignKey(
        "organizations.RevenueProgram", null=True, on_delete=models.SET_NULL
    )

    published_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.slug}"

    @property
    def is_live(self):
        return self.published_date and self.published_date <= datetime.now()

    def save_as_template(self, name=None):
        template = Template()
        for field in AbstractPage.field_names():
            page_field = getattr(self, field)
            setattr(template, field, page_field)

        template.name = name or self.title
        return Template.objects.get_or_create(template)


class Style(models.Model):
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


class DonorBenefit(models.Model):
    name = models.CharField(max_length=255)
    blurb = models.TextField(null=True, blank=True)
    tiers = models.ManyToManyField("pages.BenefitTier")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )


class BenefitTier(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, null=True, blank=True)
    benefits = models.ManyToManyField("pages.Benefit")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Benefit(models.Model):
    name = models.CharField(max_length=255)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = (
            "name",
            "organization",
        )
