import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.contributions import models


faker = Faker()


class ContributorFactory(DjangoModelFactory):
    class Meta:
        model = models.Contributor

    email = faker.email()


class ContributionFactory(DjangoModelFactory):
    class Meta:
        model = models.Contribution

    amount = faker.random_digit()
    payment_provider_used = "Stripe"
