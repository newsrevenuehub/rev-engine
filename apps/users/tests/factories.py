import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.organizations.tests.factories import OrganizationFactory
from apps.users import models


fake = Faker()
Faker.seed(0)

DEFAULT_PASSWORD = "s3cur3pa55w0rd"


class UserFactory(DjangoModelFactory):
    class Meta:
        model = models.User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"{fake.user_name()}-{n}@{fake.domain_name()}")
    password = DEFAULT_PASSWORD

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", None)
        obj = super(UserFactory, cls)._create(model_class, *args, **kwargs)
        # ensure the raw password gets set after the initial save
        obj.set_password(password)
        obj.save()
        return obj


class OrganizationUserFactory(DjangoModelFactory):
    class Meta:
        model = models.OrganizationUser

    class Params:
        user_password = DEFAULT_PASSWORD

    user = factory.SubFactory(UserFactory, password=factory.SelfAttribute("..user_password"))
    organization = factory.SubFactory(OrganizationFactory)
