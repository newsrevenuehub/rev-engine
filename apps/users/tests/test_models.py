from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users import models
from apps.users.tests.utils import create_test_user


user_model = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.hub_admin_user = create_test_user(role_assignment_data={"role_type": models.Roles.HUB_ADMIN})
        self.hub_admin_user_role_assignment = self.hub_admin_user.roleassignment

        self.org_admin_user = create_test_user(
            role_assignment_data={"role_type": models.Roles.ORG_ADMIN, "organization": self.organization}
        )
        self.org_admin_user_role_assignment = self.org_admin_user.roleassignment

        rp = RevenueProgramFactory(organization=self.organization)
        rp_qs = RevenueProgram.objects.filter(pk=rp.pk)
        self.rp_admin_user = create_test_user(
            role_assignment_data={
                "role_type": models.Roles.ORG_ADMIN,
                "organization": self.organization,
                "revenue_programs": rp_qs,
            }
        )
        self.rp_admin_user_role_assignment = self.rp_admin_user.roleassignment

    def test_get_role_assignment(self):
        hub_role_assignment = self.hub_admin_user.get_role_assignment()
        self.assertEqual(hub_role_assignment, self.hub_admin_user_role_assignment)
        org_role_assignment = self.org_admin_user.get_role_assignment()
        self.assertEqual(org_role_assignment, self.org_admin_user_role_assignment)
        rp_role_assignment = self.rp_admin_user.get_role_assignment()
        self.assertEqual(rp_role_assignment, self.rp_admin_user_role_assignment)


class RoleAssignmentModelTest(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory()

    def test_role_assigment_str(self):
        for role_val, role_label in models.Roles.choices:
            user = user_model.objects.create_user(email=f"{role_val}@test.com", password="testing")
            role_assignment = models.RoleAssignment.objects.create(
                user=user, role_type=role_val, organization=self.organization
            )
            if role_assignment.role_type == models.Roles.HUB_ADMIN:
                self.assertEqual(str(role_assignment), role_label)
            if role_assignment.role_type == models.Roles.ORG_ADMIN:
                self.assertEqual(str(role_assignment), f"{role_label} for {self.organization.name}")
            if role_assignment.role_type == models.Roles.RP_ADMIN:
                self.assertEqual(str(role_assignment), f"{role_label} for {self.organization.name}")
