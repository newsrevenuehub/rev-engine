import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.utils import normalize_slug
from apps.organizations.models import RP_SLUG_MAX_LENGTH, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory
from apps.users import models
from apps.users.choices import Roles


fake = Faker()
Faker.seed(0)

DEFAULT_PASSWORD = "s3cur3pa55w0rd"


def create_test_user(user=None, role_assignment_data=None, **kwargs):
    if not user:
        user = UserFactory(**kwargs)
    if role_assignment_data:
        rps = role_assignment_data.pop("revenue_programs", None)
        org = role_assignment_data.pop("organization", None)
        ra = RoleAssignmentFactory(user=user, **role_assignment_data)
        do_save = False
        if rps:
            ra.revenue_programs.set(rps)
            do_save = True
        if org:
            do_save = True
            ra.organization = org
        if do_save:
            ra.save()
    else:
        RoleAssignmentFactory(user=user)
    return user


class RoleAssignmentFactory(DjangoModelFactory):
    class Meta:
        model = models.RoleAssignment
        django_get_or_create = ("user",)

    user = factory.SubFactory("apps.users.tests.factories.UserFactory")
    organization = factory.SubFactory("apps.organizations.tests.factories.OrganizationFactory")

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override the default ``_create`` with our custom call."""
        obj = super()._create(model_class, *args, **kwargs)
        if cls._original_params.get("free_plan", False):
            models.OrganizationUser.objects.create(user=obj.user, organization=obj.organization)
            RevenueProgram.objects.create(
                organization=obj.organization,
                name=(name := obj.organization.name),
                slug=normalize_slug(name, None, max_length=RP_SLUG_MAX_LENGTH),
            )
        return obj

    class Params:
        free_plan = factory.Trait(role_type=Roles.ORG_ADMIN.value)


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

    @factory.post_generation
    def organization(self, create, extracted, **kwargs):
        if not create:
            self.organization = extracted if extracted else OrganizationFactory()
