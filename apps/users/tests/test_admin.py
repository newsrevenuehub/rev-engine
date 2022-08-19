from django.contrib.auth import get_user_model
from django.test import Client, TestCase

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
