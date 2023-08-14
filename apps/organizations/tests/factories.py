import factory
import factory.fuzzy
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.utils import normalize_slug
from apps.organizations import models


fake = Faker()
Faker.seed(0)


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = models.Organization
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{fake.company()}-{str(n)}")
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))

    class Params:
        free_plan = factory.Trait(plan_name=models.FreePlan.name)
        plus_plan = factory.Trait(plan_name=models.PlusPlan.name)
        core_plan = factory.Trait(plan_name=models.CorePlan.name)


class PaymentProviderFactory(DjangoModelFactory):
    class Meta:
        model = models.PaymentProvider
        django_get_or_create = ("stripe_account_id",)

    stripe_account_id = factory.Sequence(lambda n: fake.uuid4())
    stripe_verified = True


class RevenueProgramFactory(DjangoModelFactory):
    class Meta:
        model = models.RevenueProgram
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"{' '.join(fake.words(nb=4))}-{str(n)}")
    slug = factory.lazy_attribute(lambda o: normalize_slug(name=o.name))
    contact_email = fake.email()
    payment_provider = factory.SubFactory(PaymentProviderFactory)
    organization = factory.SubFactory(OrganizationFactory)

    class Params:
        onboarded = factory.Trait(payment_provider=factory.SubFactory(PaymentProviderFactory, stripe_verified=True))
        fiscally_sponsored = factory.Trait(fiscal_status=models.FiscalStatusChoices.FISCALLY_SPONSORED)
        non_profit = factory.Trait(fiscal_status=models.FiscalStatusChoices.NONPROFIT)
        for_profit = factory.Trait(fiscal_status=models.FiscalStatusChoices.FOR_PROFIT)


class BenefitFactory(DjangoModelFactory):
    class Meta:
        model = models.Benefit

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    description = fake.sentence(nb_words=8)
    revenue_program = factory.SubFactory(RevenueProgramFactory)


class BenefitLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.BenefitLevel

    name = factory.Sequence(lambda n: f"{fake.sentence(nb_words=2)}-{str(n)}")
    revenue_program = factory.SubFactory(RevenueProgramFactory)

    lower_limit = 1
    level = 1
