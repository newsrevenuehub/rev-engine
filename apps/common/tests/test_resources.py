from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


user_model = get_user_model()


class AbstractTestCase(APITestCase):
    model = None
    model_factory = None
    resource_count = 5
    org_count = 2
    rp_count = 2
    donation_pages = []

    def setUp(self):
        orgs = []
        for i in range(self.org_count):
            orgs.append(OrganizationFactory())
        for i in range(self.rp_count):
            org_num = 0 if i % 2 == 0 else 1
            RevenueProgramFactory(organization=orgs[org_num])
        self.create_user()

    def _resource_is_org_related(self, resource):
        """
        Resource may not be directly related to Org-- if it isn't we assume it is related to an Org by way of RevenueProgram
        """
        return hasattr(resource, "organization") and type(resource.organization) is not property

    def create_resources(self):
        self.orgs = Organization.objects.all()
        self.rev_programs = RevenueProgram.objects.all()
        for i in range(self.resource_count):
            num = 0 if i % 2 == 0 else 1
            if self._resource_is_org_related(self.model):
                self.model_factory.create(organization=self.orgs[num])
            else:
                self.model_factory.create(revenue_program=self.rev_programs[num])
        self.resources = self.model.objects.all()

    def create_donation_page(self, revenue_program=None):
        return DonationPageFactory(revenue_program=revenue_program if revenue_program else RevenueProgramFactory())

    def create_user(self):
        self.email = "test@test.gov"
        self.password = "testpassy"
        self.user = user_model.objects.create_user(email=self.email, password=self.password)

    def authenticate_user_for_resource(self, resource=None):
        if resource:
            if isinstance(resource, Organization):
                resource.users.add(self.user)
            elif self._resource_is_org_related(resource):
                resource.organization.users.add(self.user)
            else:
                resource.revenue_program.organization.users.add(self.user)

    def login(self):
        self.client.force_authenticate(user=self.user)

    class Meta:
        abstract = True
