import datetime
import json

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone

from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from apps.common.tests.test_resources import AbstractTestCase
from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.element_media.tests import setup_sidebar_fixture
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.models import DonationPage, Style, Template
from apps.pages.tests.factories import DonationPageFactory, StyleFactory, TemplateFactory
from apps.pages.validators import required_style_keys
from apps.pages.views import PageViewSet


user_model = get_user_model()


class PageViewSetTest(AbstractTestCase):
    model = DonationPage
    model_factory = DonationPageFactory

    def setUp(self):
        super().setUp()
        self.create_resources()
        self.rev_program = RevenueProgramFactory()
        self.authenticate_user_for_resource(self.rev_program)
        self.login()

    # CREATE
    def test_page_create_adds_page(self):
        self.assertEqual(len(self.resources), self.resource_count)
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {
            "name": "My page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
            "revenue_program_pk": self.rev_program.pk,
        }
        response = self.client.post(list_url, page_data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(DonationPage.objects.count(), self.resource_count + 1)

    def test_page_create_returns_valdiation_error_when_missing_rev_pk(self):
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {
            "name": "My page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
        }
        response = self.client.post(list_url, page_data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["revenue_program_pk"]), "revenue_program_pk is required when creating a new page"
        )

    def test_page_create_returns_valdiation_error_when_bad_rev_pk(self):
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {"name": "My page, tho", "heading": "New DonationPage", "slug": "new-page", "revenue_program_pk": 0}
        response = self.client.post(list_url, page_data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["revenue_program_pk"]), "Could not find revenue program with provided pk")

    def test_page_create_returns_revenue_program_slug(self):
        """
        Page create must return revenue_program in order to navigate the user to the
        correct url for page edit, after creating a page.
        """
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {
            "name": "My page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
            "revenue_program_pk": self.rev_program.pk,
        }
        response = self.client.post(list_url, page_data)
        self.assertIn("revenue_program", response.data)
        self.assertIn("slug", response.data["revenue_program"])

    def test_page_create_returns_validation_error_when_violiates_unique_constraint(self):
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {
            "name": "My page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
            "revenue_program_pk": self.rev_program.pk,
        }
        response = self.client.post(list_url, page_data)
        # make sure first page was created successfully
        self.assertEqual(response.status_code, 201)

        # Then make it again and expect a validation error
        error_response = self.client.post(list_url, page_data)
        self.assertEqual(error_response.status_code, 400)
        self.assertIn("slug", error_response.data)
        self.assertEqual(str(error_response.data["slug"]), "This slug is already in use on this Revenue Program")

    # UPDATE
    def test_page_update_updates_page(self):
        page = self.resources[0]
        page.revenue_program = self.rev_program
        page.save()
        self.authenticate_user_for_resource(page)
        self.login()
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = "Old DonationPage With New Heading"
        self.client.patch(detail_url, {"heading": new_heading})
        page = DonationPage.objects.get(pk=old_page_pk)
        self.assertEqual(page.pk, old_page_pk)
        self.assertNotEqual(page.heading, old_page_heading)
        self.assertEqual(page.heading, new_heading)

    def test_page_delete_deletes_page(self):
        page = self.resources[0]
        self.authenticate_user_for_resource(page)
        self.login()
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"

        response = self.client.delete(detail_url)
        self.assertRaises(DonationPage.DoesNotExist, DonationPage.objects.get, pk=old_page_pk)

    def test_cant_delete_page_owned_by_other_org(self):
        page = self.resources[0]
        org = self.resources[1].organization
        self.assertNotEqual(page.organization, org)
        org.users.add(self.user)
        org.save()

        detail_url = f"/api/v1/pages/{page.pk}/"
        self.login()
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(DonationPage.objects.filter(pk=page.pk).count(), 1)

    def test_page_list_uses_list_serializer(self):
        list_url = reverse("donationpage-list")
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_page_detail_uses_detail_serializer(self):
        self.authenticate_user_for_resource(self.resources[0])
        self.login()
        page_pk = self.resources[0].pk
        response = self.client.get(f"/api/v1/pages/{page_pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

    def test_page_list_results_are_limited_by_revenue_program(self):
        user = user_model.objects.create()
        user_org = self.orgs[0]
        user.organizations.add(user_org)

        user_pages = DonationPage.objects.filter(revenue_program=user_org.revenueprogram_set.first())

        list_url = reverse("donationpage-list")

        self.authenticate_user_for_resource(user_pages[0])
        self.login()
        response = self.client.get(list_url)
        data = response.json()

        # Should return expected number of pages
        self.assertEqual(user_pages.count(), len(data))

        returned_ids = [p["id"] for p in data]
        expected_ids = [p.id for p in user_pages]
        # Should return expected pages
        self.assertEqual(set(expected_ids), set(returned_ids))

    def test_page_list_results_not_limited_when_superuser(self):
        superuser = user_model.objects.create_superuser(email="superuser@example.com")
        self.user = superuser
        self.login()

        list_url = reverse("donationpage-list")
        response = self.client.get(list_url)
        data = response.json()

        self.assertEqual(self.resource_count, len(data))


class PagePatchTest(AbstractTestCase):
    model = DonationPage
    model_factory = DonationPageFactory

    def setUp(self):
        super().setUp()
        self.create_resources()
        self.rev_program = RevenueProgramFactory()
        self.request_factory = APIRequestFactory()
        self.donation_page = self.resources[0]
        self.donation_page.revenue_program = self.rev_program
        self.donation_page.save()
        self.styles = StyleFactory()
        self.url = reverse("donationpage-detail", kwargs={"pk": self.donation_page.pk})
        self.authenticate_user_for_resource(self.donation_page)
        self.patch_data = {
            "thank_you_redirect": "http://www.testing.com",
        }
        self.page_patch_view = PageViewSet.as_view({"patch": "partial_update"})

    def _create_patch_request(self, data=None):
        data = data if data else self.patch_data
        request = self.request_factory.patch(self.url, data=data)
        force_authenticate(request, user=self.user)
        return request

    def test_patch_page_updates_page(self):
        previous_redirect = self.donation_page.thank_you_redirect
        request = self._create_patch_request()
        response = self.page_patch_view(request, pk=self.donation_page.pk)
        self.assertNotEqual(response.data["thank_you_redirect"], previous_redirect)
        self.assertEqual(response.data["thank_you_redirect"], self.patch_data["thank_you_redirect"])

    def test_patch_page_with_styles(self):
        page_data = {"styles_pk": self.styles.pk}
        request = self._create_patch_request(data=page_data)
        response = self.page_patch_view(request, pk=self.donation_page.pk)
        self.assertEqual(response.data["styles"]["id"], self.styles.pk)

    @override_settings(MEDIA_ROOT="/tmp/media")
    @override_settings(MEDIA_URL="/media/")
    def test_patch_page_with_sidebar_elements(self):
        sidebar, files = setup_sidebar_fixture()
        for k, v in files.items():
            sidebar[k] = SimpleUploadedFile(
                name=f"{v.name}", content=get_test_image_file_jpeg().open("rb").read(), content_type="image/jpeg"
            )
        request = self._create_patch_request(data=sidebar)
        response = self.page_patch_view(request, pk=self.donation_page.pk)
        assert response.status_code == 200
        dp = DonationPage.objects.get(pk=self.donation_page.pk)
        assert dp.sidebar_elements == response.data.get("sidebar_elements")


class DonationPageFullDetailTest(APITestCase):
    def setUp(self):
        now = timezone.now()
        hour = datetime.timedelta(hours=1)
        self.revenue_program_1 = RevenueProgramFactory(slug="revenue_program_1")
        self.revenue_program_2 = RevenueProgramFactory(slug="revenue_program_2")
        self.page_1 = DonationPageFactory(
            published_date=now - hour, revenue_program=self.revenue_program_1, slug="page_1"
        )
        self.page_2 = DonationPageFactory(
            published_date=now - hour, revenue_program=self.revenue_program_1, slug="page_2"
        )
        self.page_3 = DonationPageFactory(
            published_date=now + hour, revenue_program=self.revenue_program_2, slug="page_3"
        )
        self.revenue_program_1.default_donation_page = self.page_2
        self.revenue_program_1.save()

    def _make_full_detail_request_with_params(self, rev_program=None, page=None, live=None):
        url = reverse("donationpage-live-detail") if live else reverse("donationpage-draft-detail")
        url += "?"
        if rev_program:
            url += f"revenue_program={rev_program}&"
        if page:
            url += f"page={page}&"
        if live:
            url += f"live={1 if live else 0}&"

        return self.client.get(url)

    def test_full_detail_rev_program_param_required(self):
        response = self._make_full_detail_request_with_params(page="testing")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Missing required parameter")

    def test_full_detail_page_with_live_param_searches_live(self):
        bad_response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_2.slug, page=self.page_3.slug, live=True
        )
        # Returns 404 if no live page exists
        self.assertEqual(bad_response.status_code, 404)
        self.assertEqual(bad_response.data["detail"], "This page has not been published")

        good_response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_1.slug, page=self.page_1.slug, live=True
        )
        self.assertEqual(good_response.status_code, 200)
        self.assertEqual(good_response.data["heading"], self.page_1.heading)

    def test_full_detail_returns_default_rev_page(self):
        response = self._make_full_detail_request_with_params(rev_program=self.revenue_program_1.slug, live=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.page_2.pk)

    def test_full_detail_no_such_rev_program(self):
        response = self._make_full_detail_request_with_params(rev_program="made-up-slug")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find revenue program matching those parameters")

    def test_full_detail_no_such_page(self):
        response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_1.slug, page="made-up-page"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find page matching those parameters")

    def test_full_detail_edit_insufficient_permissions(self):
        response = self._make_full_detail_request_with_params(rev_program=self.revenue_program_1.slug, live=False)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "You do not have permission to edit this page")


class TemplateViewSetTest(AbstractTestCase):
    model = Template
    model_factory = TemplateFactory

    def setUp(self):
        super().setUp()
        self.create_resources()
        self.page = DonationPageFactory(revenue_program=self.rev_programs[0])

    def test_template_create_adds_template(self):
        self.assertEqual(len(self.resources), self.resource_count)
        self.authenticate_user_for_resource()
        self.login()
        list_url = reverse("template-list")
        template_data = {
            "name": "New Template",
            "heading": "New Template",
            "page_pk": self.page.pk,
        }
        # format="json" here in order to prevent serializer from treating self.data as immutable.
        # https://stackoverflow.com/questions/52367379/why-is-django-rest-frameworks-request-data-sometimes-immutable
        response = self.client.post(list_url, template_data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Template.objects.count(), self.resource_count + 1)

        data = response.json()
        for k, v in template_data.items():
            # page_pk doesn't come back from the serializer.
            if k != "page_pk":
                self.assertEqual(v, data[k])

    def test_template_update_updates_template(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        old_template_name = template.name
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        new_name = "Old Template With New Name"
        self.client.patch(detail_url, {"name": new_name})
        template = Template.objects.filter(pk=old_template_pk).first()
        self.assertEqual(template.pk, old_template_pk)
        self.assertNotEqual(template.name, old_template_name)
        self.assertEqual(template.name, new_name)

    def test_template_delete_deletes_template(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        self.client.delete(detail_url)
        self.assertRaises(Template.DoesNotExist, Template.objects.get, pk=old_template_pk)

    def test_template_list_uses_list_serializer(self):
        list_url = reverse("template-list")
        self.authenticate_user_for_resource(self.resources[0])
        self.login()
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_template_detail_uses_detail_serializer(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        response = self.client.get(f"/api/v1/templates/{template.pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

        list_url = reverse("donationpage-list")
        response = self.client.get(list_url)

    def test_template_list_results_are_limited_by_ownership(self):
        user = user_model.objects.create()
        user_org = self.orgs[0]
        user.organizations.add(user_org)

        user_templates = self.model.objects.filter(revenue_program=user_org.revenueprogram_set.first())

        list_url = reverse("template-list")

        self.authenticate_user_for_resource(user_templates[0])
        self.login()
        response = self.client.get(list_url)
        data = response.json()

        # Should return expected number of pages
        self.assertEqual(user_templates.count(), len(data))

        returned_ids = [p["id"] for p in data]
        expected_ids = [p.id for p in user_templates]
        # Should return expected pages
        self.assertEqual(set(expected_ids), set(returned_ids))


class StylesViewsetTest(AbstractTestCase):
    model = Style
    model_factory = StyleFactory

    def setUp(self):
        super().setUp()
        self.list_url = reverse("style-list")
        self.create_resources()
        self.authenticate_user_for_resource(self.resources[0])
        revenue_program = RevenueProgramFactory()
        valid_styles_json = {}
        for k, v in required_style_keys.items():
            valid_styles_json[k] = v()
        self.styles_data = {
            "name": "New Test Styles",
            "revenue_program": {"name": revenue_program.name, "slug": revenue_program.slug},
            "random_property": "test",
            "colors": {"primary": "testing pink"},
            **valid_styles_json,
        }

    def test_flattened_to_internal_value(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.list_url, data=json.dumps(self.styles_data), content_type="application/json")
        self.assertIn("id", response.data)
        new_styles_id = response.data["id"]
        new_styles = Style.objects.get(pk=new_styles_id)
        self.assertEqual(self.styles_data["random_property"], response.data["random_property"])
        self.assertEqual(new_styles.styles["colors"]["primary"], self.styles_data["colors"]["primary"])
