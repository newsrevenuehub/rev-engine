from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory


user_model = get_user_model()


class AbstractTestCase(APITestCase):
    model = None
    model_factory = None
    resource_count = 5
    org_count = 2

    def setUp(self):
        for i in range(self.org_count):
            OrganizationFactory()
        self.create_user()

    def create_resources(self):
        self.orgs = Organization.objects.all()
        for i in range(self.resource_count):
            org_num = 0 if i % 2 == 0 else 1
            self.model_factory.create(org=self.orgs[org_num])
        self.resources = self.model.objects.all()

    def create_user(self):
        self.email = "test@test.gov"
        self.password = "testpassy"
        self.user = user_model.objects.create_user(email=self.email, password=self.password)

    def authenticate_user_for_resource(self, resource=None):
        if resource:
            resource.organization.users.add(self.user)

    def login(self):
        self.client.login(email=self.email, password=self.password)

    class Meta:
        abstract = True
