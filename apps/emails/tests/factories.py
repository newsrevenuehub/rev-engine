import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.emails import models


fake = Faker()
Faker.seed(0)
