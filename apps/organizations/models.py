from django.db import models

from apps.users.models import User


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    non_profit = models.BooleanField(default=True)
    project_manager = models.ForeignKey(User, null=True, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class RevenueProgram(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Plan(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name
