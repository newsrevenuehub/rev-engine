import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.contributions.models import Contributor
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.models import Roles
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
            }
        )
        cls.hub_user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        cls.superuser = user_model.objects.create_superuser(email="test@test.com", password="testing")
        # this must be called before _set_up_contributions
        cls._set_up_donation_pages()
        cls._set_up_contributions()

    @staticmethod
    def _resource_has_org_fk(resource):
        """
        Returns True if the provided resource has a ForeignKey to Organization.
        "organization" may still be a derived property on the model, so just
        checking `hasattr` is insufficient.
        """
        return hasattr(resource, "organization") and type(resource.organization) is not property

    @staticmethod
    def _resource_has_rp_fk(resource, related_name="revenueprogram_set"):
        return hasattr(resource, related_name)

    def _create_org_related_resources(self):
        if self._resource_has_org_fk(self.model):
            for i in range(self.resource_count):
                if i + 1 <= len(self.orgs):
                    org_index = i
                else:
                    org_index = (i % len(self.orgs)) + 1
                self.model_factory.create(organization=self.orgs[org_index])

    def _create_rp_related_resources(self):
        for i in range(self.resource_count):
            if i + 1 <= len(self.rev_programs):
                rp_index = i
            else:
                rp_index = (i % len(self.rev_programs)) + 1
            self.model_factory.create(revnue_program=self.revenue_programs[rp_index])

    @classmethod
    def create_resources(cls):
        """ """
        if AbstractTestCase._resource_has_org_fk(cls.model):
            cls._create_org_related_resources()
        elif AbstractTestCase._resource_has_rp_fk(cls.model):
            cls._create_rp_related_resources()
        else:
            cls.model_factory.create()
        cls.resources = cls.model.objects.all()

    class Meta:
        abstract = True
