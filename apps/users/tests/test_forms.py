from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users.choices import Roles
from apps.users.forms import RoleAssignmentAdminForm


class RoleAssignmentAdminFormTest(TestCase):
    def setUp(self):
        self.url = reverse("admin:users_roleassignment_add")
        self.user = get_user_model().objects.create_user(email="test@example.com", password="testing")
        self.organization = OrganizationFactory()

        for _ in range(3):
            RevenueProgramFactory(org=self.organization)

        self.rp_qs = RevenueProgram.objects.all()
        self.form = None

    def _create_request(self, user, request_body={}):
        request_factory = RequestFactory()
        request = request_factory.post(self.url, request_body)
        request.user = user
        request.sessions = {}
        return request

    def validate_form(self, request_body):
        user = self.user
        request = self._create_request(user, request_body)
        self.form = RoleAssignmentAdminForm(request.POST, user)
        return self.form.is_valid()

    def test_clean_prevents_org_when_hub_admin(self):
        request_body = {"user": self.user, "role_type": Roles.HUB_ADMIN, "organization": self.organization.pk}
        form_is_valid = self.validate_form(request_body)

        self.assertFalse(form_is_valid)
        self.assertIn("organization", self.form.errors)
        self.assertEqual(self.form.errors["organization"], [RoleAssignmentAdminForm.no_org_message])

    def test_clean_prevents_rp_when_hub_admin(self):
        request_body = {
            "user": self.user,
            "role_type": Roles.HUB_ADMIN,
            "revenue_programs": [rp.pk for rp in self.rp_qs],
        }
        form_is_valid = self.validate_form(request_body)

        self.assertFalse(form_is_valid)
        self.assertIn("revenue_programs", self.form.errors)
        self.assertEqual(self.form.errors["revenue_programs"], [RoleAssignmentAdminForm.no_rp_message])

    def test_clean_requires_org_when_org_admin(self):
        request_body = {
            "user": self.user,
            "role_type": Roles.ORG_ADMIN,
        }
        form_is_valid = self.validate_form(request_body)
        self.assertFalse(form_is_valid)
        self.assertIn("organization", self.form.errors)
        self.assertEqual(self.form.errors["organization"], [RoleAssignmentAdminForm.missing_org_message])

    def test_clean_prevents_rp_when_org_admin(self):
        request_body = {
            "user": self.user,
            "role_type": Roles.ORG_ADMIN,
            "organization": self.organization.pk,
            "revenue_programs": [rp.pk for rp in self.rp_qs],
        }
        form_is_valid = self.validate_form(request_body)
        self.assertFalse(form_is_valid)
        self.assertIn("revenue_programs", self.form.errors)
        self.assertEqual(self.form.errors["revenue_programs"], [RoleAssignmentAdminForm.no_rp_message])

    def test_clean_requires_org_when_rp_admin(self):
        request_body = {
            "user": self.user,
            "role_type": Roles.RP_ADMIN,
        }
        form_is_valid = self.validate_form(request_body)
        self.assertFalse(form_is_valid)
        self.assertIn("organization", self.form.errors)
        self.assertEqual(self.form.errors["organization"], [RoleAssignmentAdminForm.missing_org_message])

    def test_clean_requires_rps_when_rp_admin(self):
        request_body = {
            "user": self.user,
            "role_type": Roles.RP_ADMIN,
            "organization": self.organization.pk,
        }
        form_is_valid = self.validate_form(request_body)
        self.assertFalse(form_is_valid)
        self.assertIn("revenue_programs", self.form.errors)
        self.assertEqual(self.form.errors["revenue_programs"], [RoleAssignmentAdminForm.missing_rp_message])

    def test_clean_prevents_org_rp_mismatch_when_rp_admin(self):
        some_other_org = OrganizationFactory()
        mismatched_rp = RevenueProgramFactory(organization=some_other_org)
        request_body = {
            "user": self.user,
            "role_type": Roles.RP_ADMIN,
            "organization": self.organization.pk,
            "revenue_programs": [mismatched_rp.pk],
        }
        form_is_valid = self.validate_form(request_body)
        self.assertFalse(form_is_valid)
        self.assertIn("revenue_programs", self.form.errors)
        self.assertIn(
            "The following RevenuePrograms do not belong to your chosen Org:", self.form.errors["revenue_programs"][0]
        )
        self.assertIn(mismatched_rp.name, self.form.errors["revenue_programs"][0])
