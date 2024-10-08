from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

import pytest

from apps.common.views import FilterForSuperUserOrRoleAssignmentUserMixin
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import StyleFactory
from revengine.views import SAFE_ADMIN_SELECT_ACCESSOR_METHODS, SAFE_ADMIN_SELECT_PARENTS


user_model = get_user_model()


@override_settings(ALLOWED_HOSTS=["my-test.test-domain.com", "testserver"])
class ReactAppViewTestCase(TestCase):
    def setUp(self):
        self.revenue_program = RevenueProgramFactory(name="My Test", slug="my-test")

    def test_page_title_includes_rev_program_name_when_subdomain(self):
        response = self.client.get(reverse("index"), HTTP_HOST=f"{self.revenue_program.slug}.test-domain.com")
        self.assertContains(response, f"<title>Join | {self.revenue_program.name}</title>")

    def test_page_title_is_default_when_not_subdomain(self):
        response = self.client.get(reverse("index"))
        self.assertContains(response, "<title>RevEngine</title>")


class AdminSelectOptionsTest(TestCase):
    def setUp(self):
        self.user = user_model.objects.create_user(email="test@test.com", password="testing", is_staff=True)

    def _make_request_to_view(self, user=None, **params):
        if not user:
            user = self.user
        self.client.force_login(user=user)
        return self.client.get(reverse("admin-select-options"), params)

    def test_does_not_respond_to_non_get_methods(self):
        response = self.client.post(reverse("admin-select-options"))
        assert response.status_code == 405

        response = self.client.patch(reverse("admin-select-options"))
        assert response.status_code == 405

        response = self.client.put(reverse("admin-select-options"))
        assert response.status_code == 405

        response = self.client.delete(reverse("admin-select-options"))
        assert response.status_code == 405

    def test_cannot_be_accessed_by_non_staff(self):
        not_staff = user_model.objects.create(email="notstaff@test.com", password="testing")
        response = self._make_request_to_view(user=not_staff)
        # Should redirect...
        assert response.status_code == 302
        # ... to admin login
        assert reverse("admin:login") in response.url

    def test_disallowed_parent_model_name_raises_error(self):
        parent_model_name = "bad_name"
        assert parent_model_name not in SAFE_ADMIN_SELECT_PARENTS
        with pytest.raises(ValueError, match="Parent model not accepted"):
            self._make_request_to_view(parentModel=parent_model_name)

    def test_disallowed_accessor_method_raises_error(self):
        parent_model_name = SAFE_ADMIN_SELECT_PARENTS[0]
        accessor_method = "naughty_method"
        assert parent_model_name in SAFE_ADMIN_SELECT_PARENTS
        assert accessor_method not in SAFE_ADMIN_SELECT_ACCESSOR_METHODS
        with pytest.raises(ValueError, match="Accessor method not accepted"):
            self._make_request_to_view(parentModel=parent_model_name, accessorMethod=accessor_method)

    def test_returns_options_if_successful(self):
        parent_model_name = SAFE_ADMIN_SELECT_PARENTS[1]
        accessor_method = SAFE_ADMIN_SELECT_ACCESSOR_METHODS[0]
        assert parent_model_name in SAFE_ADMIN_SELECT_PARENTS
        assert accessor_method in SAFE_ADMIN_SELECT_ACCESSOR_METHODS

        org = OrganizationFactory()
        revenue_program = RevenueProgramFactory(organization=org)
        style1 = StyleFactory(revenue_program=revenue_program)
        style2 = StyleFactory(revenue_program=revenue_program)

        response = self._make_request_to_view(
            parentModel=parent_model_name, accessorMethod=accessor_method, parentId=revenue_program.pk
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

    def test_filter_queryset_for_superuser_or_ra(self, user):
        class MyClass(FilterForSuperUserOrRoleAssignmentUserMixin):
            def __init__(self, user):
                self.request = Mock()
                self.request.user = user
                self.model = Mock()

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
