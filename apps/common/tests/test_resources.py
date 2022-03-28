import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.models import Organization, Plan, RevenueProgram
from apps.organizations.tests.factories import (
    FeatureFactory,
    OrganizationFactory,
    PlanFactory,
    RevenueProgramFactory,
)
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.choices import Roles
from apps.users.tests.utils import create_test_user


user_model = get_user_model()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class AbstractTestCase(APITestCase):
    """ """

    model = None
    model_factory = None
    resource_count = 5
    org_count = 2
    rp_count = 2
    contributors_count = 2
    donation_pages_per_rp_count = 2
    plans_per_org = 2
    features_per_plan = 2

    @classmethod
    def _set_up_contributions(cls):
        """ """
        # because we want to be able to provide scaffolding
        # to have contributors contributing to some but not
        # other pages
        if DonationPage.objects.count() < 2:
            logger.warn("Tests relying on this mixin may be trivial when there " "are less than 2 donation pages")
        for x in range(cls.contributors_count):
            contributor = ContributorFactory()
            for idx, page in enumerate(DonationPage.objects.all()):
                if any(
                    [
                        x % 2 == 0,
                        idx % 2 == 0,
                    ]
                ):
                    ContributionFactory(
                        donation_page=page,
                        organization=page.revenue_program.organization,
                        contributor=contributor,
                    )
        cls.contributor_user = Contributor.objects.first()

    @classmethod
    def _set_up_donation_pages(cls):
        for i in range(cls.donation_pages_per_rp_count):
            DonationPageFactory(revenue_program=cls.org1_rp1)
            DonationPageFactory(revenue_program=cls.org1_rp2)
            DonationPageFactory(revenue_program=cls.org2_rp)

    @classmethod
    def _set_up_feature_sets(cls):
        for plan in Plan.objects.all():
            features = [FeatureFactory() for x in range(cls.features_per_plan)]
            plan.features.add(*features)
            plan.save()

    @classmethod
    def set_up_domain_model(cls):
        """Set up most commonly needed data models in a predictable way for use across tests

        NB: The names and relations here matter. There is test code that expects that there are
        two orgs, with the given RevenueProgram, DonationPage, and RoleAssignment/User structures
        """
        cls.org1 = OrganizationFactory()
        cls.org2 = OrganizationFactory()
        cls.org1_rp1 = RevenueProgramFactory(organization=cls.org1)
        cls.org1_rp2 = RevenueProgramFactory(organization=cls.org1)
        cls.org2_rp = RevenueProgramFactory(organization=cls.org2)
        cls.orgs = Organization.objects.all()
        cls.rev_programs = RevenueProgram.objects.all()
        cls.org_user = create_test_user(role_assignment_data={"role_type": Roles.ORG_ADMIN, "organization": cls.org1})
        cls.rp_user = create_test_user(
            role_assignment_data={
                "role_type": Roles.RP_ADMIN,
                "revenue_programs": [
                    cls.org1_rp1,
                ],
                "organization": cls.org1,
            }
        )
        cls.hub_user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        cls.superuser = user_model.objects.create_superuser(email="test@test.com", password="testing")
        cls.generic_user = create_test_user()
        # this must be called before _set_up_contributions
        cls._set_up_donation_pages()
        cls._set_up_contributions()
        cls._set_up_feature_sets()

    class Meta:
        abstract = True
