from django.contrib.auth import get_user_model
from django.test import RequestFactory

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase, force_authenticate

from apps.api.permissions import IsContributor
from apps.contributions.tests.factories import ContributorFactory


user_model = get_user_model()


class IsContributorTest(APITestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.url = reverse("contribution-list")
        self.regular_user = user_model.objects.create_user(email="test@test.com", password="testing")
        self.contributor = ContributorFactory()
        self.permission = IsContributor()

    def _create_request(self, user):
        request = self.factory.post(self.url)
        request.user = user
        force_authenticate(request, user=user)
        return request

    def test_success_when_contributor(self):
        request = self._create_request(self.contributor)
        has_permission = self.permission.has_permission(request, {})
        self.assertTrue(has_permission)

    def test_failure_when_not_contributor(self):
        request = self._create_request(self.regular_user)
        has_permission = self.permission.has_permission(request, {})
        self.assertFalse(has_permission)
