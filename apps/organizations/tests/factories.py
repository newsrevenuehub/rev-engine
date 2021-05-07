import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.organizations import models


faker = Faker()


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization

    name = faker.name()
    slug = factory.Sequence(lambda n: "test-slug-%d" % n)
