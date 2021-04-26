import factory
from factory.django import DjangoModelFactory
from faker import Faker

from apps.organizations import models


fake = Faker()
Faker.seed(0)


class PlanFactory(DjangoModelFactory):
    class Meta:
        model = models.Plan

    name = fake.word()


class FeatureFactory(DjangoModelFactory):
    class Meta:
        model = models.Feature

    name = " ".join(fake.words(nb=2))
    description = fake.text()

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        obj = model_class(*args, **kwargs)
        plans = kwargs.get("plans", None)
        if plans:
            for plan in plans:
                obj.plans = plan
                obj.save()
        obj.save()
        return obj


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization

    name = fake.company()

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        obj = model_class(*args, **kwargs)
        name = kwargs.get("name", None)
        plan = kwargs.get("plan", None)
        if name:
            obj.name = name
        if plan:
            obj.plan = plan
        obj.save()
        return obj


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram

    name = " ".join(fake.words(nb=4))
    organization = factory.SubFactory(OrganizationFactory)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        obj = model_class(*args, **kwargs)
        name = kwargs.get("name", None)
        organization = kwargs.get("organization", None)
        if name:
            obj.name = name
        if organization:
            obj.organization = organization
        obj.save()
        return obj
