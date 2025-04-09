from django.contrib.auth import get_user_model
from django.urls import reverse

import pytest
from bs4 import BeautifulSoup

import apps.users
from apps.organizations.models import Organization
from apps.organizations.tests.factories import OrganizationFactory
from apps.users.tests.factories import RoleAssignmentFactory


user_model = get_user_model()


@pytest.fixture
def authed_client(superuser, client):
    client.force_login(superuser)
    return client


@pytest.mark.django_db
class TestRoleAssignmentAdmin:
    @pytest.fixture
    def orgs(self):
        org1 = OrganizationFactory(name="Alpha")
        org2 = OrganizationFactory(name="Charlie")
        org3 = OrganizationFactory(name="Delta")
        org4 = OrganizationFactory(name="Bravo")
        return [org1, org2, org3, org4]

    def test_org_dropdown_is_alphabetized(self, authed_client, orgs):
        ra = RoleAssignmentFactory()
        assert Organization.objects.count() >= len(orgs)
        # prove later assertions aren't trivial (i.e., not already sorted)
        assert Organization.objects.all().values_list("name") != Organization.objects.all().order_by(
            "name"
        ).values_list("name")
        response = authed_client.get(f"/nrhadmin/users/roleassignment/{ra.id}/change/")
        soup = BeautifulSoup(response.content)
        select = soup.find("select", {"name": "organization"})
        org_options = [opt.text for opt in select.find_all("option") if opt.attrs.get("value")]
        assert org_options == sorted(org_options)


@pytest.mark.django_db
class TestUsersAdmin:
    def test_views_stand_up(self, authed_client):
        authed_client.get("/nrhadmin/users/user/")
        authed_client.get("/nrhadmin/users/user/add/")
        authed_client.get("/nrhadmin/users/roleassignment/")
        authed_client.get("/nrhadmin/users/roleassignment/add/")

    def test_get_readonly_fields(self, superuser):
        t = apps.users.admin.RoleAssignmentAdmin(apps.users.models.RoleAssignment, "")
        assert t.get_readonly_fields(None, obj=superuser) == [
            "user",
        ]

    def test_columns_in_user_list(self, authed_client):
        response = authed_client.get("/nrhadmin/users/user/")
        soup = BeautifulSoup(response.content)
        assert soup.find("th", {"class": "column-email"}) is not None
        assert soup.find("th", {"class": "column-is_superuser"}) is not None
        assert soup.find("th", {"class": "column-is_staff"}) is not None
        assert soup.find("th", {"class": "column-role_assignment"}) is not None
        assert soup.find("th", {"class": "column-last_login"}) is not None

    def test_user_fields_in_admin(self, authed_client):
        user_id = user_model.objects.all()[0].id
        response = authed_client.get(f"/nrhadmin/users/user/{user_id}/change/")
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

    def test_user_fields_in_add(self, authed_client):
        response = authed_client.get("/nrhadmin/users/user/add/")
        soup = BeautifulSoup(response.content)
        assert soup.find("input", {"name": "email"}) is not None
        assert soup.find("input", {"name": "password1"}) is not None
        assert soup.find("input", {"name": "password2"}) is not None
        assert soup.find("input", {"name": "email_verified"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_0"}) is not None
        assert soup.find("input", {"name": "accepted_terms_of_service_1"}) is not None

    def test_caseinsensitive_email_uniqueness(self, authed_client):
        email_1 = "test.hello.123@test.com"
        password = "sjdDKKDJF!23233"
        # create a test user
        authed_client.post(
            reverse("admin:users_user_add"), {"email": email_1, "password1": password, "password2": password}
        )
        # create test user with same email id as previous but in upper case
        response = authed_client.post(
            reverse("admin:users_user_add"), {"email": email_1.upper(), "password1": password, "password2": password}
        )
        content = BeautifulSoup(response.content)
        assert content.find(text="User with this Email already exists.") is not None
