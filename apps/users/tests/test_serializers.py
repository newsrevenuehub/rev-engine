from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase

from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users import serializers
from apps.users.choices import Roles
from apps.users.tests.utils import create_test_user


user_model = get_user_model()


class UserSerializerTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.included_rps = []
        self.not_included_rps = []
        for i in range(3):
            if i % 2 == 0:
                self.included_rps.append(RevenueProgramFactory(organization=self.organization))
            else:
                self.not_included_rps.append(RevenueProgramFactory())
        self.superuser_user = user_model.objects.create_superuser(email="superuser@test.com", password="password")
        self.hub_admin_user = create_test_user(role_assignment_data={"role_type": Roles.HUB_ADMIN})
        self.org_admin_user = create_test_user(
            role_assignment_data={"role_type": Roles.ORG_ADMIN, "organization": self.organization}
        )
        self.rp_admin_user = create_test_user(
            role_assignment_data={
                "role_type": Roles.RP_ADMIN,
                "organization": self.organization,
                "revenue_programs": self.included_rps,
            }
        )
        self.no_role_user = user_model.objects.create(email="no_role_user@test.com", password="password")

        self.serializer = serializers.UserSerializer

    def _get_serialized_data_for_user(self, user):
        return self.serializer(user).data

    def _ids_from_data(self, data):
        return [entity["id"] for entity in data]

    def _org_id_from_role(self, user):
        role_assignment = user.get_role_assignment()
        return role_assignment.organization.pk

    def _rp_ids_from_role(self, user):
        role_assignment = user.get_role_assignment()
        return list(role_assignment.revenue_programs.values_list("pk", flat=True))

    def test_get_role_type(self):
        super_user_role = self._get_serialized_data_for_user(self.superuser_user)["role_type"]
        self.assertEqual(super_user_role, ("superuser", "Superuser"))

        hub_admin_role = self._get_serialized_data_for_user(self.hub_admin_user)["role_type"]
        self.assertEqual(hub_admin_role, (Roles.HUB_ADMIN, Roles.HUB_ADMIN.label))

        org_admin_role = self._get_serialized_data_for_user(self.org_admin_user)["role_type"]
        self.assertEqual(org_admin_role, (Roles.ORG_ADMIN, Roles.ORG_ADMIN.label))

        rp_admin_role = self._get_serialized_data_for_user(self.rp_admin_user)["role_type"]
        self.assertEqual(rp_admin_role, (Roles.RP_ADMIN, Roles.RP_ADMIN.label))

    def test_get_permitted_organizations(self):
        super_user_data = self._get_serialized_data_for_user(self.superuser_user)
        su_org_ids = self._ids_from_data(super_user_data["organizations"])
        self.assertEqual(su_org_ids, list(Organization.objects.values_list("pk", flat=True)))

        hub_admin_data = self._get_serialized_data_for_user(self.hub_admin_user)
        ha_org_ids = self._ids_from_data(hub_admin_data["organizations"])
        self.assertEqual(ha_org_ids, list(Organization.objects.values_list("pk", flat=True)))

        org_admin_data = self._get_serialized_data_for_user(self.org_admin_user)
        oa_org_ids = self._ids_from_data(org_admin_data["organizations"])
        self.assertEqual(len(oa_org_ids), 1)
        self.assertEqual(oa_org_ids[0], self._org_id_from_role(self.org_admin_user))

        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rp_org_ids = self._ids_from_data(rp_admin_data["organizations"])
        self.assertEqual(len(rp_org_ids), 1)
        self.assertEqual(rp_org_ids[0], self._org_id_from_role(self.rp_admin_user))

    def test_get_permitted_revenue_programs(self):
        super_user_data = self._get_serialized_data_for_user(self.superuser_user)
        su_rp_ids = self._ids_from_data(super_user_data["revenue_programs"])
        self.assertEqual(su_rp_ids, list(RevenueProgram.objects.values_list("pk", flat=True)))

        hub_admin_data = self._get_serialized_data_for_user(self.hub_admin_user)
        ha_rp_ids = self._ids_from_data(hub_admin_data["revenue_programs"])
        self.assertEqual(ha_rp_ids, list(RevenueProgram.objects.values_list("pk", flat=True)))

        org_admin_data = self._get_serialized_data_for_user(self.org_admin_user)
        oa_rp_ids = self._ids_from_data(org_admin_data["revenue_programs"])
        org_admin_expected_rps = self.org_admin_user.get_role_assignment().organization.revenueprogram_set.all()
        self.assertEqual(len(oa_rp_ids), org_admin_expected_rps.count())
        self.assertEqual(oa_rp_ids, list(org_admin_expected_rps.values_list("pk", flat=True)))

        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rp_rp_ids = self._ids_from_data(rp_admin_data["revenue_programs"])
        self.assertEqual(len(rp_rp_ids), len(self.included_rps))
        self.assertEqual(rp_rp_ids, self._rp_ids_from_role(self.rp_admin_user))
        self.assertEqual(rp_rp_ids, [rp.id for rp in self.included_rps])

    def test_no_role_user(self):
        no_role_data = self._get_serialized_data_for_user(self.no_role_user)
        self.assertIsNone(no_role_data["role_type"])
        # We want empty lists here, specifically
        self.assertTrue(no_role_data["organizations"] == [])
        self.assertTrue(no_role_data["revenue_programs"] == [])

        # But we do expect the other data
        self.assertEqual(self.no_role_user.pk, no_role_data["id"])
        self.assertEqual(self.no_role_user.email, no_role_data["email"])

    def test_listed_revenue_programs_include_org_id(self):
        """
        The front-end uses the RevenueProgram.organization.pk for some simple filtering. Ensure that it is present.
        """
        rp_admin_data = self._get_serialized_data_for_user(self.rp_admin_user)
        rps = rp_admin_data["revenue_programs"]
        # An "organization" field should be present
        self.assertTrue(all([True for rp in rps if "organization" in rp]))
        org_ids = [rp["organization"] for rp in rps]
        expected_org_ids = [rp.organization.pk for rp in self.included_rps]
        self.assertEqual(org_ids, expected_org_ids)
