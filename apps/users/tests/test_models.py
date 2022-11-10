from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users import models
from apps.users.google_pub_sub import Message
from apps.users.tests.factories import create_test_user


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

    def test_get_full_name(self):
        self.assertIsNotNone(self.hub_admin_user.get_full_name())

    def test_str_method_with_different_user_types(self):
        str(self.hub_admin_user)
        str(self.org_admin_user)
        str(self.rp_admin_user)
        str(create_test_user())

    @patch("apps.users.models.google_cloud_pub_sub_is_configured", MagicMock(return_value=True))
    @patch("django.conf.settings.NEW_USER_TOPIC")
    @patch("apps.users.google_pub_sub.GoogleCloudPubSubPublisher")
    def test_publishes_external_emails_to_google_pubsub(self, publisher, new_user_topic):
        topic = "topic"
        new_user_topic.return_value = topic
        email = "contributor@some-address.com"
        create_test_user(email=email)
        publisher.publish.called_with(new_user_topic, Message(data=email))

    @patch("apps.users.models.google_cloud_pub_sub_is_configured", MagicMock(return_value=True))
    @patch("apps.users.google_pub_sub.GoogleCloudPubSubPublisher.publish")
    def test_publishes_internal_emails_to_google_pubsub(self, publish):
        email = "contributor@fundjournalism.org"
        create_test_user(email=email)
        assert not publish.called

    @patch("apps.users.models.google_cloud_pub_sub_is_configured", MagicMock(return_value=False))
    @patch("apps.users.google_pub_sub.GoogleCloudPubSubPublisher.publish")
    def test_publishes_if_gcloud_pub_sub_not_configured(self, publish):
        email = "contributor@fundjournalism.org"
        create_test_user(email=email)
        assert not publish.called

    @patch("apps.users.models.google_cloud_pub_sub_is_configured", MagicMock(return_value=True))
    @patch("django.conf.settings.NEW_USER_TOPIC")
    @patch("apps.users.google_pub_sub.GoogleCloudPubSubPublisher")
    def test_only_publishes_for_create(self, publisher, new_user_topic):
        topic = "topic"
        new_user_topic.return_value = topic
        email = "contributor@some-address.com"
        user = create_test_user(email=email)
        user.last_name = "Targaryen"
        publisher.publish.called_once_with(new_user_topic, Message(data=email))


class RoleAssignmentModelTest(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.organization)

    def test_role_assignment_str(self):
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
                role_assignment.revenue_programs.add(self.revenue_program)
                role_assignment.save()
                self.assertTrue(f"{role_label} for these revenue programs: " in str(role_assignment))
