from django.contrib.auth import get_user_model
from django.urls import reverse

import pytest

from apps.common.views import FilterForSuperUserOrRoleAssignmentUserMixin
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import StyleFactory
from revengine.views import SAFE_ADMIN_SELECT_ACCESSOR_METHODS, SAFE_ADMIN_SELECT_PARENTS


user_model = get_user_model()


@pytest.mark.django_db
class TestReactAppView:
    @pytest.fixture(autouse=True)
    def _settings(self, settings):
        settings.ALLOWED_HOSTS = ["my-test.test-domain.com", "testserver"]

    def test_page_title_includes_rev_program_name_when_subdomain(self, client):
        rp = RevenueProgramFactory(name="Join", slug="my-test")
        response = client.get(reverse("index"), HTTP_HOST=f"{rp.slug}.test-domain.com")
        assert f"<title>Join | {rp.name}</title>" in response.rendered_content

    def test_page_title_is_default_when_not_subdomain(self, client):
        response = client.get(reverse("index"))
        assert "<title>RevEngine</title>" in response.rendered_content


@pytest.mark.django_db
class TestAdminSelectOptions:

    @pytest.fixture
    def user(self):
        return user_model.objects.create_user(email="test@test.com", password="testing", is_staff=True)

    def _make_request_to_view(self, client, user, **params):
        return client.get(reverse("admin-select-options"), params | {"user": user})

    def test_does_not_respond_to_non_get_methods(self, admin_client):
        response = admin_client.post(reverse("admin-select-options"))
        assert response.status_code == 405

        response = admin_client.patch(reverse("admin-select-options"))
        assert response.status_code == 405

        response = admin_client.put(reverse("admin-select-options"))
        assert response.status_code == 405

        response = admin_client.delete(reverse("admin-select-options"))
        assert response.status_code == 405

    def test_cannot_be_accessed_by_non_staff(self, client):
        not_staff = user_model.objects.create(email="notstaff@test.com", password="testing")
        client.force_login(not_staff)
        response = self._make_request_to_view(user=not_staff, client=client)
        # Should redirect...
        assert response.status_code == 302
        # ... to admin login
        assert reverse("admin:login") in response.url

    def test_disallowed_parent_model_name_raises_error(self, user, admin_client):
        parent_model_name = "bad_name"
        assert parent_model_name not in SAFE_ADMIN_SELECT_PARENTS
        with pytest.raises(ValueError, match="Parent model not accepted"):
            self._make_request_to_view(client=admin_client, parentModel=parent_model_name, user=user)

    def test_disallowed_accessor_method_raises_error(self, user, admin_client):
        parent_model_name = SAFE_ADMIN_SELECT_PARENTS[0]
        accessor_method = "naughty_method"
        assert parent_model_name in SAFE_ADMIN_SELECT_PARENTS
        assert accessor_method not in SAFE_ADMIN_SELECT_ACCESSOR_METHODS
        with pytest.raises(ValueError, match="Accessor method not accepted"):
            self._make_request_to_view(
                client=admin_client, user=user, parentModel=parent_model_name, accessorMethod=accessor_method
            )

    def test_returns_options_if_successful(self, admin_client, user):
        parent_model_name = SAFE_ADMIN_SELECT_PARENTS[1]
        accessor_method = SAFE_ADMIN_SELECT_ACCESSOR_METHODS[0]
        assert parent_model_name in SAFE_ADMIN_SELECT_PARENTS
        assert accessor_method in SAFE_ADMIN_SELECT_ACCESSOR_METHODS

        org = OrganizationFactory()
        revenue_program = RevenueProgramFactory(organization=org)
        style1 = StyleFactory(revenue_program=revenue_program)
        style2 = StyleFactory(revenue_program=revenue_program)

        response = self._make_request_to_view(
            user=user,
            client=admin_client,
            parentModel=parent_model_name,
            accessorMethod=accessor_method,
            parentId=revenue_program.pk,
        )
        options = response.json()["data"]
        option1 = next(o for o in options if o[1] == style1.pk)
        option2 = next(o for o in options if o[1] == style2.pk)

        assert option1[0] == style1.name
        assert option2[0] == style2.name


@pytest.mark.django_db
class TestFilterForSuperUserOrRoleAssignmentUserMixin:
    @pytest.fixture(params=["superuser", "org_user_free_plan", "user_no_role_assignment"])
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_filter_queryset_for_superuser_or_ra(self, user, mocker):
        class MyClass(FilterForSuperUserOrRoleAssignmentUserMixin):
            def __init__(self, user):
                self.request = mocker.Mock()
                self.request.user = user
                self.model = mocker.Mock()

        view = MyClass(user)
        view.filter_queryset_for_superuser_or_ra()
        if user.is_superuser:
            view.model.objects.all.assert_called_once()
            view.model.objects.none.assert_not_called()
            view.model.objects.filtered_by_role_assignment.assert_not_called()
        elif ra := user.get_role_assignment():
            assert view.model.objects.filtered_by_role_asssignment.called_once(ra)
            view.model.objects.all.assert_not_called()
            view.model.objects.none.assert_not_called()
        else:
            view.model.objects.filtered_by_role_assignment.assert_not_called()
            view.model.objects.none.assert_called_once()
