from django.db import models

from apps.common.constants import STATE_CHOICES


class Feature(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Plan(models.Model):
    name = models.CharField(max_length=255)
    features = models.ManyToManyField("organizations.Feature")

    def __str__(self):
        return self.name


class Organization(models.Model):

    name = models.CharField(max_length=255)
    slug = models.SlugField()
    plan = models.ForeignKey("organizations.Plan", null=True, on_delete=models.CASCADE)
    non_profit = models.BooleanField(default=True, verbose_name="Non-profit?")
    project_manager = models.ForeignKey("users.User", null=True, on_delete=models.CASCADE)
    stripe_account = models.CharField(max_length=255, blank=True)
    org_addr1 = models.CharField(max_length=255, verbose_name="Address 1")
    org_addr2 = models.CharField(max_length=255, blank=True, verbose_name="Address 2")
    org_city = models.CharField(max_length=64, verbose_name="City")
    org_state = models.CharField(max_length=2, choices=STATE_CHOICES, verbose_name="State")
    org_zip = models.CharField(max_length=9, verbose_name="Zip")
    salesforce_id = models.CharField(max_length=255, blank=True, verbose_name="Salesforce ID")

    def __str__(self):
        return self.name


class RevenueProgram(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.M("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name
