from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from bs4 import BeautifulSoup

import apps.users


user_model = get_user_model()


class TestUsersAdmin(TestCase):
    def setUp(self):
        email = "foo@bar.com"
        password = "passwordPASSSWORD"
        self.index_url = "/"
        self.user = user_model.objects.create_superuser(email=email, password=password)
        self.client = Client()
        self.client.login(email=email, password=password)

    def test_views_stand_up(self):
        self.client.get("/nrhadmin/users/user/")
        self.client.get("/nrhadmin/users/user/add/")
        self.client.get("/nrhadmin/users/roleassignment/")
        self.client.get("/nrhadmin/users/roleassignment/add/")

    def test_get_readonly_fields(self):
        t = apps.users.admin.RoleAssignment(apps.users.models.RoleAssignment, "")
        assert [
            "user",
        ] == t.get_readonly_fields(None, obj=self.user)

    def test_user_fields_in_admin(self):
        user_id = user_model.objects.all()[0].id
        response = self.client.get(f"/nrhadmin/users/user/{user_id}/change/")
        soup = BeautifulSoup(response.content)
        self.assertIsNotNone(soup.find("input", {"name": "email"}))
        self.assertIsNotNone(soup.find("input", {"name": "first_name"}))
        self.assertIsNotNone(soup.find("input", {"name": "last_name"}))
        self.assertIsNotNone(soup.find("input", {"name": "job_title"}))
