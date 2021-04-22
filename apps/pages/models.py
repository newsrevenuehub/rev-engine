from django.db import models


class AbstractPage(models.Model):
    header_bg_image = models.ImageField(null=True, blank=True)
    header_logo = models.ImageField(null=True, blank=True)
    header_link = models.URLField(null=True, blank=True)

    title = models.CharField(max_length=255)

    elements = models.JSONField(null=True, blank=True)

    class Meta:
        abstract = True


class Template(AbstractPage):
    """
    A "Snapshot" of a Page at a particular state.
    """

    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class Page(AbstractPage):
    """
    A Page represents a single instance of a Donation Page.
    """

    slug = models.SlugField(unique=True)

    published_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.slug}"
