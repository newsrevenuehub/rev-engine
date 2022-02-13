from factory.django import DjangoModelFactory
from faker import Faker

from apps.config import models


fake = Faker()
Faker.seed(0)


class DenyListWordFactory(DjangoModelFactory):
    word = fake.word()

    class Meta:
        model = models.DenyListWord
