from random import choice, randint, uniform

import factory
import factory.fuzzy
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.utils import normalize_slug
from apps.contributions.choices import CardBrand, PaymentType
from apps.contributions.models import ContributionInterval, ContributionStatus
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
        plus_plan = factory.Trait(plan_name=models.PlusPlan.name, stripe_subscription_id=f"sub_{fake.uuid4()}")
        core_plan = factory.Trait(plan_name=models.CorePlan.name, stripe_subscription_id=f"sub_{fake.uuid4()}")


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


class StripePaymentIntentFactory:
    interval = choice(list(ContributionInterval.__members__.values()))
    card_brand = choice(list(CardBrand.__members__.values()))
    is_modifiable = choice([True, False])
    is_cancelable = choice([True, False])
    last4 = randint(1111, 9999)
    amount = uniform(0, 1000)
    created = fake.date_time_between(start_date="-5d", end_date="now")
    provider_customer_id = fake.uuid4()
    last_payment_date = fake.date_time_between(start_date="-5d", end_date="now")
    status = choice(list(ContributionStatus.__members__.values()))
    credit_card_expiration_date = f"{randint(1, 12)}/{randint(2022, 2099)}"
    payment_type = choice(list(PaymentType.__members__.values()))
    refunded = choice([True, False])

    def __init__(self, revenue_program=None, payment_type="card", status=ContributionStatus.PAID) -> None:
        self.id = fake.uuid4()
        self.revenue_program = revenue_program
        self.payment_type = payment_type
        self.status = status
        if not revenue_program:
            self.revenue_program = normalize_slug(f"{' '.join(fake.words(nb=4))}")
