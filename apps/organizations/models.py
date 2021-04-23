from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    def __str__(self):
        return self.name


class RevenueProgram(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name
