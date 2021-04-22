from factory.django import DjangoModelFactory

from apps.organizations import models


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization
