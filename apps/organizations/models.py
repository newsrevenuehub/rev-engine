from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()

    users = models.ManyToManyField("users.User", through="users.OrganizationUser")

    def __str__(self):
        return self.name

    def user_is_member(self, user):
        return user in self.users.all()


class RevenueProgram(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)

    def __str__(self):
        return self.name
