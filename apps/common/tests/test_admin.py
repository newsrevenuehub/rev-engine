from django.contrib.auth import get_user_model
from django.test import Client, TestCase


user_model = get_user_model()


class TestCommonAdmin(TestCase):
    def setUp(self):
        email = "foo@bar.com"
        password = "passwordPASSSWORD"
        self.index_url = "/"
        self.user = user_model.objects.create_superuser(email=email, password=password)
        self.client = Client()
        self.client.login(email=email, password=password)

    def test_views_stand_up(self):
        self.client.get("/nrhadmin/common/revenginehistoricalchange/")
        self.client.get("/nrhadmin/common/revenginehistoricalchange/add/")
