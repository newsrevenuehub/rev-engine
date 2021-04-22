from apps.organizations import models
from factory.django import DjangoModelFactory


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization
