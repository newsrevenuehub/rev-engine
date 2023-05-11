from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

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

    def test_columns_in_user_list(self):
        response = self.client.get("/nrhadmin/users/user/")
        soup = BeautifulSoup(response.content)
        assert soup.find("th", {"class": "column-email"}) is not None
        assert soup.find("th", {"class": "column-is_superuser"}) is not None
        assert soup.find("th", {"class": "column-is_staff"}) is not None
        assert soup.find("th", {"class": "column-role_assignment"}) is not None
        assert soup.find("th", {"class": "column-last_login"}) is not None

    def test_user_fields_in_admin(self):
        user_id = user_model.objects.all()[0].id
        response = self.client.get(f"/nrhadmin/users/user/{user_id}/change/")
        soup = BeautifulSoup(response.content)
        assert soup.find("input", {"name": "email"}) is not None
        assert soup.find("input", {"name": "first_name"}) is not None
        assert soup.find("input", {"name": "last_name"}) is not None
        assert soup.find("input", {"name": "job_title"}) is not None
        assert soup.find("input", {"name": "email_verified"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_0"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_1"}) is not None
        assert soup.find("div", {"class": "field-last_login"}) is not None
        assert len(soup.select(".field-last_login .readonly")) > 0

    def test_user_fields_in_add(self):
        response = self.client.get("/nrhadmin/users/user/add/")
        soup = BeautifulSoup(response.content)
        assert soup.find("input", {"name": "email"}) is not None
        assert soup.find("input", {"name": "password1"}) is not None
        assert soup.find("input", {"name": "password2"}) is not None
        assert soup.find("input", {"name": "email_verified"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_0"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_1"}) is not None

    def test_caseinsensitive_email_uniqueness(self):
        email_1 = "test.hello.123@test.com"
        password = "sjdDKKDJF!23233"
        # create a test user
        self.client.post(
            reverse("admin:users_user_add"), {"email": email_1, "password1": password, "password2": password}
        )
        # create test user with same email id as previous but in upper case
        response = self.client.post(
            reverse("admin:users_user_add"), {"email": email_1.upper(), "password1": password, "password2": password}
        )
        content = BeautifulSoup(response.content)
        assert content.find(text="User with this Email already exists.") is not None
