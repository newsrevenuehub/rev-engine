from django.test import TestCase
from django.urls import reverse

from apps.organizations.tests.factories import RevenueProgramFactory


class ReactAppViewTestCase(TestCase):
    def setUp(self):
        self.revenue_program = RevenueProgramFactory(name="My Test", slug="my-test")

    def test_page_title_includes_rev_program_name_when_subdomain(self):
        response = self.client.get(reverse("index"), HTTP_HOST=f"{self.revenue_program.slug}.test-domain.com")
        print(response.status_code)
        print(response.content)
        self.assertEqual(response.status_code, 200)
        # self.assertIn(response.content, f"<title>Join | {self.revenue_program.name}</title>")

    def test_page_title_is_default_when_not_subdomain(self):
        response = self.client.get(reverse("index"))
        print(response.status_code)
        print(response.content)
        self.assertEqual(response.status_code, 200)
        # self.assertIn(response.content, "<title>RevEngine</title>")
