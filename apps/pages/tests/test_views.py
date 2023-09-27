import json
import random
import re
import string
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

import pytest
import pytest_cases
from faker import Faker
from PIL import Image
from rest_framework import status
from rest_framework.reverse import reverse

from apps.organizations.models import FreePlan, PaymentProvider, Plans, PlusPlan, RevenueProgram
from apps.organizations.serializers import RevenueProgramForPageDetailSerializer
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.models import (
    PAGE_HEADING_MAX_LENGTH,
    PAGE_NAME_MAX_LENGTH,
    DonationPage,
    Font,
    PagesAppQuerySet,
    Style,
)
from apps.pages.serializers import (
    DonationPageFullDetailSerializer,
    DonationPageListSerializer,
    StyleListSerializer,
)
from apps.pages.tests.factories import DonationPageFactory, FontFactory, StyleFactory
from apps.users.models import Roles


fake = Faker()


PAGE_DATA_EXTRA_ITEMS = {"foo": "bar", "id": "123", "created": "never"}


@pytest.fixture
def page_creation_data_valid():
    """Minimally valid page creation data

    Note that a request made using this data could still fail if the requesting user does not have the right user
    type or permissions
    """
    return {"revenue_program": RevenueProgramFactory(onboarded=True).id, "name": "some name"}


@pytest.fixture
def page_creation_data_invalid_because_out_of_pages(page_creation_data_valid, live_donation_page):
    assert (org := live_donation_page.revenue_program.organization).plan_name == Plans.FREE
    assert DonationPage.objects.filter(revenue_program__organization=org).count() == 1
    return page_creation_data_valid | {"revenue_program": live_donation_page.revenue_program.id}


@pytest.fixture
def page_creation_data_valid_empty_name(page_creation_data_valid):
    return page_creation_data_valid | {"name": ""}


@pytest.fixture
def page_creation_data_valid_no_name(page_creation_data_valid):
    data = {**page_creation_data_valid}
    del data["name"]
    return data


@pytest.fixture
def page_creation_invalid_non_unique_slug_for_rp(page_creation_data_valid, live_donation_page):
    live_donation_page.revenue_program_id = page_creation_data_valid["revenue_program"]
    live_donation_page.save()
    return page_creation_data_valid | {"slug": live_donation_page.slug}


@pytest.fixture
def page_data_with_invalid_slug_spaces():
    return {"slug": "some invalid slug"}


@pytest.fixture
def page_data_with_invalid_slug_invalid_chars():
    return {"slug": "!"}


@pytest.fixture
def page_data_with_invalid_slug_empty_string():
    return {"slug": ""}


@pytest.fixture
def page_data_with_invalid_slug_too_long():
    return {"slug": "x" * (DonationPage._meta.get_field("slug").max_length + 1)}


@pytest.fixture(
    params=[
        "page_data_with_invalid_slug_invalid_chars",
        "page_data_with_invalid_slug_spaces",
        "page_data_with_invalid_slug_too_long",
        "page_creation_invalid_non_unique_slug_for_rp",
        "page_data_with_invalid_slug_empty_string",
    ]
)
def page_creation_data_with_invalid_slug(page_creation_data_valid, request):
    return page_creation_data_valid | request.getfixturevalue(request.param)


@pytest.fixture
def page_update_data_invalid_non_unique_slug_for_rp(live_donation_page):
    data = {"slug": (slug := live_donation_page.slug)}
    live_donation_page.slug = live_donation_page.slug[::-1]
    live_donation_page.save()
    DonationPageFactory(revenue_program=live_donation_page.revenue_program, slug=slug)
    return data


@pytest.fixture(
    params=[
        "page_data_with_invalid_slug_invalid_chars",
        "page_data_with_invalid_slug_spaces",
        "page_data_with_invalid_slug_too_long",
        "page_update_data_invalid_non_unique_slug_for_rp",
    ]
)
def page_update_data_with_invalid_slug(request):
    return request.getfixturevalue(request.param)


@pytest.fixture
def page_creation_invalid_name_too_long(page_creation_data_valid):
    return page_creation_data_valid | {
        "name": "".join(random.choice(string.ascii_lowercase) for i in range(PAGE_NAME_MAX_LENGTH + 1))
    }


@pytest.fixture
def page_creation_invalid_heading_too_long(page_creation_data_valid):
    return page_creation_data_valid | {
        "heading": "".join(random.choice(string.ascii_lowercase) for i in range(PAGE_HEADING_MAX_LENGTH + 1))
    }


@pytest.fixture
def page_creation_invalid_extra_keys(page_creation_data_valid):
    return page_creation_data_valid | PAGE_DATA_EXTRA_ITEMS


@pytest.fixture
def page_creation_invalid_missing_rp(page_creation_data_valid):
    data = {**page_creation_data_valid}
    del data["revenue_program"]
    return data


@pytest.fixture
def page_creation_invalid_blank_rp(page_creation_data_valid):
    return page_creation_data_valid | {"revenue_program": ""}


@pytest.fixture
def page_creation_invalid_non_existent_rp(page_creation_data_valid):
    RevenueProgram.objects.filter(pk=page_creation_data_valid["revenue_program"]).delete()
    return page_creation_data_valid


@pytest.fixture
def page_creation_invalid_with_published_but_slug_empty(page_creation_data_valid):
    data = {**page_creation_data_valid | {"published_date": "2020-09-17T00:00:00", "slug": ""}}
    return data


@pytest.fixture
def page_creation_invalid_with_published_but_no_slug_field(page_creation_data_valid):
    assert "slug" not in page_creation_data_valid
    data = {**page_creation_data_valid | {"published_date": "2020-09-17T00:00:00"}}
    return data


@pytest.fixture
def page_creation_data_with_unpermitted_sidebar_elements(page_creation_data_valid):
    org = RevenueProgram.objects.get(pk=page_creation_data_valid["revenue_program"]).organization
    assert org.plan_name == Plans.FREE
    return page_creation_data_valid | {"sidebar_elements": [{"type": x} for x in PlusPlan.sidebar_elements]}


@pytest.fixture
def page_creation_data_with_unpermitted_elements(page_creation_data_valid):
    org = RevenueProgram.objects.get(pk=page_creation_data_valid["revenue_program"]).organization
    assert org.plan_name == Plans.FREE
    return page_creation_data_valid | {"elements": [{"type": x} for x in PlusPlan.page_elements]}


@pytest.fixture
def patch_page_valid_data():
    return {
        "name": fake.company(),
        "elements": json.dumps([{"type": x} for x in FreePlan.page_elements]),
        "sidebar_elements": json.dumps([{"type": x} for x in FreePlan.sidebar_elements]),
    }


def jpg_img():
    img = BytesIO()
    Image.new("RGB", (100, 100)).save(img, "JPEG")
    img.seek(0)
    return img


@pytest.fixture
def header_logo():
    return SimpleUploadedFile("header_logo.jpg", jpg_img().read(), content_type="jpeg")


@pytest.fixture
def header_bg_image():
    return SimpleUploadedFile("header_bg_image.jpg", jpg_img().read(), content_type="jpeg")


@pytest.fixture
def graphic():
    return SimpleUploadedFile("graphic.jpg", jpg_img().read(), content_type="jpeg")


@pytest.fixture
def page_screenshot():
    return SimpleUploadedFile("screenshot.jpg", jpg_img().read(), content_type="jpeg")


@pytest.fixture
def patch_page_data_with_image_fields(patch_page_valid_data, header_logo, header_bg_image, graphic):
    return patch_page_valid_data | {
        "header_logo": header_logo,
        "header_bg_image": header_bg_image,
        "graphic": graphic,
    }


@pytest.fixture
def patch_page_valid_data_extra_keys(patch_page_valid_data):
    return patch_page_valid_data | PAGE_DATA_EXTRA_ITEMS


@pytest.fixture
def patch_page_unowned_style(patch_page_valid_data):
    style = StyleFactory(revenue_program=RevenueProgramFactory(name="unique-to-patch-page-unowned-style"))
    return patch_page_valid_data | {"styles": style.pk}


@pytest.fixture
def patch_page_unfound_style(patch_page_valid_data):
    unfound_pk = "999999"
    assert not Style.objects.filter(pk=unfound_pk).exists()
    return patch_page_valid_data | {"styles": unfound_pk}


@pytest.fixture
def patch_page_unowned_rp(patch_page_valid_data):
    name = "unique-to-patch-page-unowned-rp"
    rp = RevenueProgramFactory(name=name, organization=OrganizationFactory(name=name))
    return patch_page_valid_data | {"revenue_program": rp.pk}


@pytest.fixture
def patch_page_unfound_rp(patch_page_valid_data):
    unfound_pk = "999999"
    assert not RevenueProgram.objects.filter(pk=unfound_pk).exists()
    return patch_page_valid_data | {"revenue_program": unfound_pk}


@pytest.fixture
def patch_page_poorly_formed_elements(patch_page_valid_data):
    return patch_page_valid_data | {"elements": ["foo", True, None]}


@pytest.fixture
def patch_page_poorly_formed_sidebar_elements(patch_page_valid_data):
    return patch_page_valid_data | {"sidebar_elements": ["foo", True, None]}


@pytest.fixture
def patch_page_unpermitted_elements(patch_page_valid_data, live_donation_page):
    unpermitted_free_plan_elements = set(PlusPlan.page_elements).difference(FreePlan.page_elements)
    live_donation_page.revenue_program.organization.plan_name = Plans.FREE
    live_donation_page.revenue_program.organization.save()
    return patch_page_valid_data | {"elements": [{"type": [x for x in unpermitted_free_plan_elements]}]}


@pytest.fixture
def patch_page_unpermitted_sidebar_elements(patch_page_valid_data, live_donation_page):
    unpermitted_free_plan_elements = set(PlusPlan.sidebar_elements).difference(FreePlan.sidebar_elements)
    live_donation_page.revenue_program.organization.plan_name = Plans.FREE
    live_donation_page.revenue_program.organization.save()
    return patch_page_valid_data | {"sidebar_elements": [{"type": [x for x in unpermitted_free_plan_elements]}]}


@pytest.fixture
def patch_page_when_publishing_and_no_slug_param(patch_page_valid_data, live_donation_page):
    live_donation_page.published_date = None
    live_donation_page.slug = None
    live_donation_page.save()
    assert "slug" not in patch_page_valid_data
    return patch_page_valid_data | {"published_date": "2020-09-17T00:00:00"}


@pytest.fixture
def patch_page_when_publishing_and_empty_slug_param(patch_page_valid_data, live_donation_page):
    live_donation_page.published_date = None
    live_donation_page.slug = None
    live_donation_page.save()
    return patch_page_valid_data | {"published_date": "2020-09-17T00:00:00", "slug": ""}


@pytest.fixture
def live_donation_page_with_styles(live_donation_page):
    styles = StyleFactory(revenue_program=live_donation_page.revenue_program)
    live_donation_page.styles = styles
    live_donation_page.save()
    return live_donation_page


@pytest.mark.django_db
class TestPageViewSet:
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_page_when_expected_user_and_valid_data(self, user, page_creation_data_valid, api_client):
        """Show that permitted users providing valid data can create a page

        Note that in the parametrization setup above, we provide a lambda function that gets called with user fixture and a revenue program pk. This is used
        to guarantee the user has access to the referenced revenue program.
        """
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            rp = RevenueProgram.objects.get(pk=page_creation_data_valid["revenue_program"])
            rp.organization = user.roleassignment.organization
            rp.save()
            user.roleassignment.revenue_programs.add(rp)

        before_count = DonationPage.objects.count()
        api_client.force_authenticate(user)
        response = api_client.post(reverse("donationpage-list"), data=page_creation_data_valid, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert DonationPage.objects.count() == before_count + 1
        page = DonationPage.objects.get(pk=response.json()["id"])
        for key, val in [(key, val) for (key, val) in page_creation_data_valid.items() if key != "revenue_program"]:
            assert getattr(page, key) == val
            assert response.json()[key] == val
        assert (
            response.json()["revenue_program"]
            == RevenueProgramForPageDetailSerializer(RevenueProgram.objects.get(pk=page.revenue_program.pk)).data
        )

    @pytest_cases.parametrize(
        "creation_data",
        (
            pytest_cases.fixture_ref("page_creation_data_valid_empty_name"),
            pytest_cases.fixture_ref("page_creation_data_valid_no_name"),
        ),
    )
    @pytest.mark.parametrize("data_format", ("json", "multipart"))
    def test_create_page_when_valid_data_no_page_name_provided(
        self, creation_data, data_format, api_client, hub_admin_user
    ):
        """Show behavior of page creation with falsy page name

        We expect the page to be named after the rp.
        """
        api_client.force_authenticate(hub_admin_user)
        assert not creation_data.get("name", None)
        response = api_client.post(reverse("donationpage-list"), data=creation_data, format=data_format)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == RevenueProgram.objects.get(pk=creation_data["revenue_program"]).name

    @pytest_cases.parametrize(
        "data,expected_response",
        (
            (
                pytest_cases.fixture_ref("page_creation_invalid_name_too_long"),
                {"name": [f"Ensure this field has no more than {PAGE_NAME_MAX_LENGTH} characters."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_invalid_heading_too_long"),
                {"heading": [f"Ensure this field has no more than {PAGE_HEADING_MAX_LENGTH} characters."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_invalid_missing_rp"),
                {"revenue_program": ["This field is required."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_invalid_blank_rp"),
                {"revenue_program": ["This field may not be null."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_invalid_with_published_but_slug_empty"),
                {"slug": ["This field may not be blank."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_invalid_with_published_but_no_slug_field"),
                {"slug": ["This field is required."]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_data_with_unpermitted_elements"),
                {"page_elements": ["You're not allowed to use the following elements: DSwag"]},
            ),
            (
                pytest_cases.fixture_ref("page_creation_data_with_unpermitted_sidebar_elements"),
                {"sidebar_elements": ["You're not allowed to use the following elements: DBenefits"]},
            ),
        ),
    )
    def test_create_page_when_invalid_data(self, data, expected_response, hub_admin_user, api_client):
        """Show the behavior of a variety of similarly scoped validation behaviors

        Ideally, we'd also include tests like `test_create_page_when_invalid_because_org_not_own_rp` as a parametrized case above,
        but in order to guarantee the "not owned" state of the referenced revenue program, we need to refer to combinations of fixtures
        with enough complexity to make them not ideal candidates for capturing that logic in a parametrized function that takes fixtures as lambda args.

        In practice, it's much easier to have "simple" validation cases parametrized as above, and then handle the unique complexity
        around ownership of referred-to data in separate test functions.
        """
        api_client.force_authenticate(hub_admin_user)
        response = api_client.post(reverse("donationpage-list"), data=data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == expected_response

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_page_when_invalid_because_org_not_own_rp(self, user, page_creation_data_valid, api_client):
        """Show the behavior when a user tries to create a page for a revenue program that doesn't belong to them"""
        api_client.force_authenticate(user)
        rp = RevenueProgram.objects.get(pk=page_creation_data_valid["revenue_program"])
        rp.organization = OrganizationFactory()
        rp.save()
        assert rp.organization != user.roleassignment.organization
        response = api_client.post(reverse("donationpage-list"), data=page_creation_data_valid, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"revenue_program": ["Not found"]}

    def test_create_page_when_invalid_because_rp_not_exist(
        self, hub_admin_user, page_creation_invalid_non_existent_rp, api_client
    ):
        """Show the behavior when a user tries to create a page refering to a missing revenue program"""
        api_client.force_authenticate(hub_admin_user)
        assert not RevenueProgram.objects.filter(pk=page_creation_invalid_non_existent_rp["revenue_program"]).exists()
        response = api_client.post(
            reverse("donationpage-list"), data=page_creation_invalid_non_existent_rp, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "revenue_program": [
                f'Invalid pk "{page_creation_invalid_non_existent_rp["revenue_program"]}" - object does not exist.'
            ]
        }

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_page_when_invalid_because_org_not_own_style(
        self, user, style, page_creation_data_valid, api_client
    ):
        """Show the behavior when a user tries to create a page refering to an unowned style"""
        assert style.revenue_program not in user.roleassignment.revenue_programs.all()
        data = page_creation_data_valid | {"styles": style.id}
        api_client.force_authenticate(user)
        response = api_client.post(reverse("donationpage-list"), data=data, format="json")
        assert response.json() == {"styles": ["Not found"]}

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_page_when_invalid_because_style_not_exist(self, user, style, page_creation_data_valid, api_client):
        """Show the behavior when a user tries to create a page refering to a non-existent style"""
        style_id = style.id
        style.delete()
        api_client.force_authenticate(user)
        response = api_client.post(
            reverse("donationpage-list"), data=page_creation_data_valid | {"styles": style_id}, format="json"
        )
        assert response.json() == {"styles": [f'Invalid pk "{style_id}" - object does not exist.']}

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.CORE.value, Plans.PLUS.value))
    def test_create_when_already_at_page_limit(self, plan, hub_admin_user, api_client):
        rp = RevenueProgramFactory(organization=OrganizationFactory(plan_name=plan))
        data = {
            "revenue_program": rp.id,
            "slug": rp.slug,
        }
        api_client.force_authenticate(hub_admin_user)
        remaining = (limit := rp.organization.plan.page_limit)
        if remaining:
            DonationPageFactory.create_batch(remaining, revenue_program=rp, published_date=None)
        response = api_client.post(reverse("donationpage-list"), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "non_field_errors": [f"Your organization has reached its limit of {limit} page{'' if limit == 1 else 's'}"]
        }

    @pytest_cases.parametrize("plan", (Plans.FREE.value, Plans.CORE.value, Plans.PLUS.value))
    def test_create_when_already_at_publish_limit(self, plan, hub_admin_user, api_client):
        rp = RevenueProgramFactory(organization=OrganizationFactory(plan_name=plan))
        for i in range((limit := rp.organization.plan.page_limit)):
            DonationPageFactory(
                revenue_program=rp,
                published_date=timezone.now() if i + 1 < rp.organization.plan.publish_limit else None,
            )
        data = {
            "revenue_program": rp.id,
            "slug": rp.slug,
        }
        api_client.force_authenticate(hub_admin_user)
        response = api_client.post(reverse("donationpage-list"), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "non_field_errors": [f"Your organization has reached its limit of {limit} page{'' if limit == 1 else 's'}"]
        }

    def test_create_page_when_invalid_slug(self, hub_admin_user, page_creation_data_with_invalid_slug, api_client):
        """Show the behavior when a user tries to create a page with an invalid slug"""
        api_client.force_authenticate(hub_admin_user)
        response = api_client.post(
            reverse("donationpage-list"), data=page_creation_data_with_invalid_slug, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "slug" in response.json()

    def assert_retrieved_page_detail_looks_right(self, serialized_data, page):
        """"""
        assert serialized_data == json.loads(json.dumps(DonationPageFullDetailSerializer(page).data))

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_retrieve_when_expected_user(self, user, api_client, mocker):
        """Expected users should be able to retrieve what they're permitted to, and not what they're not."""
        # ensure there will be page that org admin and rp admin won't be able to access, but that superuser should be able to.
        api_client.force_authenticate(user)
        if user.is_superuser:
            DonationPageFactory()
            query = DonationPage.objects.all()
            assert query.count()
            for id in query.values_list("id", flat=True):
                response = api_client.get(reverse("donationpage-detail", args=(id,)))
                assert response.status_code == status.HTTP_200_OK
                assert response.json() == json.loads(
                    json.dumps(
                        DonationPageFullDetailSerializer(DonationPage.objects.get(pk=response.json()["id"])).data
                    )
                )
        else:
            DonationPageFactory(
                revenue_program=RevenueProgram.objects.get(pk=user.roleassignment.revenue_programs.first().pk)
            )
            DonationPageFactory(revenue_program=RevenueProgramFactory())
            query = DonationPage.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
            unpermitted = DonationPage.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            for id in query.values_list("id", flat=True):
                response = api_client.get(reverse("donationpage-detail", args=(id,)))
                assert response.status_code == status.HTTP_200_OK
                assert response.json() == json.loads(
                    json.dumps(
                        DonationPageFullDetailSerializer(DonationPage.objects.get(pk=response.json()["id"])).data
                    )
                )

                self.assert_retrieved_page_detail_looks_right(
                    response.json(), DonationPage.objects.get(pk=response.json()["id"])
                )
            for id in unpermitted.values_list("id", flat=True):
                assert (
                    api_client.get(reverse("donationpage-detail", args=(id,))).status_code == status.HTTP_404_NOT_FOUND
                )
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called for each time we tried to retrieve
            # a page.
            assert spy.call_count == DonationPage.objects.count()

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_retrieve_when_unauthorized_user(self, user, expected_status, live_donation_page, api_client):
        """Show behavior when an unauthorized user tries to access

        By "unauthorized" we mean both unauthenticated users and authenticated users
        that don't have the right user type
        """
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("donationpage-detail", args=(live_donation_page.pk,)))
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_can_retrieve_when_expected_user_and_no_payment_provider(self, user, live_donation_page, api_client):
        api_client.force_authenticate(user)
        if not user.is_superuser:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
        live_donation_page.revenue_program.payment_provider.delete()
        response = api_client.get(reverse("donationpage-detail", args=(live_donation_page.pk,)))
        assert response.status_code == status.HTTP_200_OK

    def assert_page_list_item_looks_right(self, serialized_data):
        assert serialized_data == json.loads(
            json.dumps(DonationPageListSerializer(DonationPage.objects.get(pk=serialized_data["id"])).data)
        )

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_list_when_expected_user(self, user, api_client, live_donation_page, mocker):
        """Show that expected users see all the pages they should see and none they shouldn't when listing"""
        # ensure there will be pages that org admin and rp admin won't be able to access, but that superuser should be able to
        # access
        DonationPageFactory.create_batch(size=2)
        api_client.force_authenticate(user)

        # superuser can retrieve all
        if user.is_superuser:
            query = DonationPage.objects.all()
            assert query.count()
            response = api_client.get(reverse("donationpage-list"))
            assert response.status_code == status.HTTP_200_OK
            assert len(pages := response.json()) == query.count()
            assert set([x["id"] for x in pages]) == set(list(query.values_list("id", flat=True)))
            for x in response.json():
                self.assert_page_list_item_looks_right(x)
        else:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
            query = DonationPage.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
            unpermitted = DonationPage.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            response = api_client.get(reverse("donationpage-list"))
            assert len(pages := response.json()) == query.count()
            assert set([x["id"] for x in pages]) == set(list(query.values_list("id", flat=True)))
            for x in response.json():
                self.assert_page_list_item_looks_right(x)
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called.
            assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_list_when_unauthorized_user(self, user, expected_status, api_client):
        """Show behavior when unauthorized users try to list pages

        By "unauthorized" we mean both unauthenticated users and authenticated users that don't have the right user type
        """
        if user:
            api_client.force_authenticate(user)
        assert api_client.get(reverse("donationpage-list")).status_code == expected_status

    def test_page_list_when_no_provider(self, api_client, superuser):
        DonationPageFactory.create_batch(size=3)
        PaymentProvider.objects.all().delete()
        api_client.force_authenticate(superuser)
        response = api_client.get(reverse("donationpage-list"))
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)
        assert len(response.json()) == DonationPage.objects.count()

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_put_not_allowed(self, user, expected_status, api_client, live_donation_page):
        """Nobody puts pages"""
        if user:
            api_client.force_authenticate(user)
        assert (
            api_client.put(reverse("donationpage-detail", args=(live_donation_page.pk,)), data={}).status_code
            == expected_status
        )

    @pytest.mark.parametrize(
        "plan",
        (
            Plans.FREE.value,
            Plans.CORE.value,
            Plans.PLUS.value,
        ),
    )
    def test_patch_when_expected_user_with_valid_data(
        self, plan, patch_page_valid_data, hub_admin_user, api_client, mocker
    ):
        org = OrganizationFactory(plan_name=plan)
        rp = RevenueProgramFactory(organization=org)
        page = DonationPageFactory(revenue_program=rp, published_date=None)
        api_client.force_authenticate(hub_admin_user)
        response = api_client.patch(
            reverse("donationpage-detail", args=(page.id,)),
            patch_page_valid_data,
        )
        assert response.status_code == status.HTTP_200_OK
        page.refresh_from_db()
        serialized_from_db = json.loads(json.dumps(DonationPageFullDetailSerializer(page).data))
        for k, v in {k: v for k, v in patch_page_valid_data.items() if k not in PAGE_DATA_EXTRA_ITEMS}.items():
            match k:
                case "elements" | "sidebar_elements":
                    assert getattr(page, k) == json.loads(v)
                case _:
                    assert serialized_from_db[k] == v
        assert response.json() == json.loads(json.dumps(DonationPageFullDetailSerializer(page).data))

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_patch_when_expected_user_with_valid_image_data(
        self, user, live_donation_page, api_client, patch_page_data_with_image_fields
    ):
        """Show expected users can..."""
        api_client.force_authenticate(user)
        if not user.is_superuser:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
        response = api_client.patch(
            reverse("donationpage-detail", args=(live_donation_page.id,)),
            data=patch_page_data_with_image_fields,
            format="multipart",
        )
        assert response.status_code == status.HTTP_200_OK
        live_donation_page.refresh_from_db()
        serialized_from_db = json.loads(json.dumps(DonationPageFullDetailSerializer(live_donation_page).data))
        make_file_name_regex = lambda raw_name: re.compile(rf"(/media/{raw_name})[\_a-zA-Z0-9]*\.jpg")
        assert make_file_name_regex("graphic").match(serialized_from_db["graphic"]) is not None
        assert make_file_name_regex("header_logo").match(serialized_from_db["header_logo"]) is not None
        assert make_file_name_regex("header_bg_image").match(serialized_from_db["header_bg_image"]) is not None

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_patch_when_expected_user_with_valid_data_with_extra_keys(
        self, user, patch_page_valid_data_extra_keys, live_donation_page, api_client
    ):
        """Show behavior when extra fields are provided in otherwise valid data

        In this case, the request can succeed, but the problematic fields are disregarded.
        """
        api_client.force_authenticate(user)
        if not user.is_superuser:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
        last_modified = live_donation_page.modified
        response = api_client.patch(
            reverse("donationpage-detail", args=(live_donation_page.id,)),
            data=patch_page_valid_data_extra_keys,
            format="multipart",
        )
        assert response.status_code == status.HTTP_200_OK
        live_donation_page.refresh_from_db()
        assert live_donation_page.modified > last_modified

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_patch_when_expected_user_unowned_page(
        self, user, patch_page_valid_data, live_donation_page, api_client, mocker
    ):
        """Show behavior when an expected user tries to patch an unowned page"""
        assert live_donation_page not in user.roleassignment.revenue_programs.all()
        assert live_donation_page.revenue_program.organization != user.roleassignment.organization
        last_modified = live_donation_page.modified
        api_client.force_authenticate(user)
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        response = api_client.patch(
            reverse("donationpage-detail", args=(live_donation_page.id,)), data=patch_page_valid_data, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        live_donation_page.refresh_from_db()
        assert live_donation_page.modified == last_modified
        assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            # TODO: [DEV-3193] Fix bug where superuser can assign a style that is unowned by an RP to its donation page
            # pytest_cases.fixture_ref("superuser"),
        ),
    )
    @pytest_cases.parametrize(
        "data,error_key",
        (
            (pytest_cases.fixture_ref("patch_page_unowned_style"), "styles"),
            (pytest_cases.fixture_ref("patch_page_unfound_style"), "styles"),
            (pytest_cases.fixture_ref("patch_page_unowned_rp"), "revenue_program"),
            (pytest_cases.fixture_ref("patch_page_unfound_rp"), "revenue_program"),
            (pytest_cases.fixture_ref("patch_page_unpermitted_elements"), "elements"),
            (pytest_cases.fixture_ref("patch_page_unpermitted_sidebar_elements"), "sidebar_elements"),
            (pytest_cases.fixture_ref("patch_page_poorly_formed_elements"), "elements"),
            (pytest_cases.fixture_ref("patch_page_poorly_formed_sidebar_elements"), "sidebar_elements"),
            (pytest_cases.fixture_ref("patch_page_when_publishing_and_empty_slug_param"), "slug"),
            (pytest_cases.fixture_ref("patch_page_when_publishing_and_no_slug_param"), "slug"),
        ),
    )
    def test_patch_when_expected_user_with_invalid_data(self, user, data, error_key, api_client, live_donation_page):
        """Show expected users can patch"""
        api_client.force_authenticate(user)
        if not user.is_superuser:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
        response = api_client.patch(reverse("donationpage-detail", args=(live_donation_page.pk,)), data=data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert list(response.json().keys()) == [error_key]

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_patch_when_unauthorized_user(
        self, user, expected_status, live_donation_page, patch_page_valid_data, api_client
    ):
        """Show behavior when an unauthorized user tries to patch a donation page"""
        api_client.force_authenticate(user)
        last_modified = live_donation_page.modified
        assert (
            api_client.patch(
                reverse("donationpage-detail", args=(live_donation_page.id,)), data=patch_page_valid_data, format="json"
            ).status_code
            == expected_status
        )
        live_donation_page.refresh_from_db()
        assert live_donation_page.modified == last_modified

    def test_patch_when_invalid_because_unpermitted_thank_you_redirect(
        self, patch_page_valid_data, superuser, live_donation_page, api_client
    ):
        """ """
        api_client.force_authenticate(superuser)
        assert live_donation_page.revenue_program.organization.plan_name == Plans.FREE
        response = api_client.patch(
            reverse("donationpage-detail", args=(live_donation_page.id,)),
            patch_page_valid_data | {"thank_you_redirect": "https://somewhere.com"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "thank_you_redirect": ["This organization's plan does not enable assigning a custom thank you URL"]
        }

    @pytest.mark.parametrize("plan", (Plans.FREE.value, Plans.CORE.value, Plans.PLUS.value))
    def test_patch_when_at_published_limit_and_try_to_publish(
        self, plan, live_donation_page, hub_admin_user, api_client
    ):
        if plan == Plans.PLUS.value:
            # there's not a path to test updating an existing page such that would push over publish_limit
            # because the publish_limit is the same as the page_limit. We test for this equivalence to ensure
            # we're not errantly leaving out this plan from the other test path.
            assert PlusPlan.publish_limit == PlusPlan.page_limit
        else:
            live_donation_page.revenue_program.organization.plan_name = plan
            live_donation_page.revenue_program.organization.save()
            live_donation_page.refresh_from_db()
            for i in range((rp := live_donation_page.revenue_program).organization.plan.publish_limit):
                DonationPageFactory(
                    revenue_program=rp,
                    published_date=timezone.now() if i < rp.organization.plan.publish_limit else None,
                )
            unpublished = DonationPageFactory(revenue_program=rp, published_date=None)
            data = {"published_date": timezone.now()}
            api_client.force_authenticate(user=hub_admin_user)
            response = api_client.patch(
                reverse("donationpage-detail", args=(unpublished.id,)),
                data,
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json()["non_field_errors"] == [
                f"Your organization has reached its limit of {rp.organization.plan.publish_limit} published page{'' if rp.organization.plan.publish_limit == 1 else 's'}"
            ]

    def test_patch_when_invalid_slug_data(
        self, superuser, api_client, live_donation_page, page_update_data_with_invalid_slug
    ):
        api_client.force_authenticate(superuser)
        response = api_client.patch(
            reverse("donationpage-detail", args=(live_donation_page.id,)),
            data=page_update_data_with_invalid_slug,
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "slug" in response.json()

    def test_patch_when_already_sidebar_elements_edge_case(
        self,
        superuser,
        api_client,
        live_donation_page,
        page_screenshot,
    ):
        # This test is to ensure we don't introduce regression that would cause
        # the bug in https://news-revenue-hub.atlassian.net/browse/DEV-2861 to happen again.
        # For more context, see the lengthy code comment in apps.pages.views.PageViewSet.partial_update.
        live_donation_page.sidebar_elements = [
            {
                "type": "DImage",
                "uuid": "testImageFile",
                "requiredFields": [],
                "content": {"url": "/media/test.png", "thumbnail": "/media/cache/thumbnail.png"},
            }
        ]
        live_donation_page.save()
        old_page_heading = live_donation_page.heading
        rich_text_index = next(
            (index for (index, x) in enumerate(live_donation_page.elements) if x["type"] == "DRichText"), None
        )
        assert rich_text_index is not None
        elements = live_donation_page.elements.copy()
        elements[rich_text_index]["content"] = "new value"
        patch_data = {
            "elements": json.dumps(elements),
            "page_screenshot": page_screenshot,
        }
        api_client.force_authenticate(user=superuser)
        response = api_client.patch(reverse("donationpage-detail", args=(live_donation_page.id,)), patch_data)
        assert response.status_code == status.HTTP_200_OK
        live_donation_page.refresh_from_db()
        assert live_donation_page.heading == old_page_heading

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_delete_when_expected_user(self, user, live_donation_page, api_client, mocker):
        api_client.force_authenticate(user)
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        if not user.is_superuser:
            live_donation_page.revenue_program = user.roleassignment.revenue_programs.first()
            live_donation_page.save()
        response = api_client.delete(reverse("donationpage-detail", args=(live_donation_page.id,)))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not DonationPage.objects.filter(pk=live_donation_page.id).exists()
        if not user.is_superuser:
            assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_delete_when_unauthorized_user(self, user, expected_status, live_donation_page, api_client):
        if user:
            api_client.force_authenticate(user)
        response = api_client.delete(reverse("donationpage-detail", args=(live_donation_page.id,)))
        assert response.status_code == expected_status
        assert DonationPage.objects.filter(pk=live_donation_page.id).exists()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_delete_when_unowned(self, user, live_donation_page, api_client):
        api_client.force_authenticate(user)
        assert live_donation_page.revenue_program not in user.roleassignment.revenue_programs.all()
        response = api_client.delete(reverse("donationpage-detail", args=(live_donation_page.id,)))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert DonationPage.objects.filter(pk=live_donation_page.id).exists()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_delete_when_not_exist(self, user, live_donation_page, api_client):
        api_client.force_authenticate(user)
        page_id = live_donation_page.id
        live_donation_page.delete()
        response = api_client.delete(reverse("donationpage-detail", args=(page_id,)))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("contributor_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            None,
        ),
    )
    def test_live_detail_page_happy_path(self, user, live_donation_page, api_client):
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": live_donation_page.slug},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == json.loads(
            json.dumps(DonationPageFullDetailSerializer(instance=live_donation_page, context={"live": True}).data)
        )

    def test_live_detail_page_with_styles(self, api_client, live_donation_page_with_styles):
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {
                "revenue_program": live_donation_page_with_styles.revenue_program.slug,
                "page": live_donation_page_with_styles.slug,
            },
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == json.loads(
            json.dumps(
                DonationPageFullDetailSerializer(instance=live_donation_page_with_styles, context={"live": True}).data
            )
        )

    @pytest.mark.parametrize("make_query", (lambda page: {}, lambda page: {"page": page.slug}))
    def test_live_detail_page_missing_rp_query_param(self, make_query, live_donation_page, api_client):
        url = reverse("donationpage-live-detail")
        response = api_client.get(url, make_query(live_donation_page), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"detail": "Missing required parameter"}

    @pytest.mark.parametrize(
        "query_params",
        (
            {"revenue_program": "nothing-has-this-name", "page": "nothing-named-this"},
            {"revenue_program": "nothing-has-this-name"},
        ),
    )
    def test_live_detail_page_not_found_because_rp_not_found(self, query_params, api_client, live_donation_page):
        assert not DonationPage.objects.filter(
            **{
                "revenue_program__slug": query_params.get("revenue_program", None),
                "slug": query_params.get("page", None),
            }
        ).exists()
        response = api_client.get(reverse("donationpage-live-detail"), query_params)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Could not find revenue program matching those parameters"}

    def test_live_detail_page_not_found_because_page_not_found(self, api_client, live_donation_page):
        unfound_page_slug = "unfound"
        assert not DonationPage.objects.filter(
            revenue_program__slug=live_donation_page.revenue_program.slug, slug=unfound_page_slug
        )
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": unfound_page_slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Could not find page matching those parameters"}

    def test_live_detail_page_missing_default_donation_page(self, api_client, revenue_program):
        assert revenue_program.default_donation_page is None
        response = api_client.get(reverse("donationpage-live-detail"), {"revenue_program": revenue_program.slug})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Could not find page matching those parameters"}

    def test_live_detail_page_when_not_published(self, live_donation_page, api_client):
        live_donation_page.published_date = None
        live_donation_page.save()
        assert live_donation_page.is_live is False
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": live_donation_page.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "This page has not been published"}

    def test_live_detail_page_when_payment_provider_unverified(self, live_donation_page, api_client):
        live_donation_page.revenue_program.payment_provider.stripe_verified = False
        live_donation_page.revenue_program.payment_provider.save()
        assert live_donation_page.revenue_program.payment_provider.is_verified_with_default_provider() is False
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": live_donation_page.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        # TODO: [DEV-3189] Don't leak info about revenue program payment provider verification publicly
        assert response.json() == {"detail": "RevenueProgram does not have a fully verified payment provider"}

    def test_live_detail_page_when_no_payment_provider(self, live_donation_page, api_client):
        live_donation_page.revenue_program.payment_provider.delete()
        response = api_client.get(
            reverse("donationpage-live-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": live_donation_page.slug},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        # TODO: [DEV-3189] Don't leak info about revenue program payment provider verification publicly
        assert response.json() == {"detail": "RevenueProgram does not have a payment provider configured"}

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_draft_detail_page_when_expected_user(self, user, api_client, live_donation_page):
        api_client.force_authenticate(user)
        other_page = DonationPageFactory()
        if user.is_superuser:
            for page in [live_donation_page, other_page]:
                assert (
                    api_client.get(
                        reverse("donationpage-draft-detail"),
                        {"revenue_program": page.revenue_program.slug, "page": page.slug},
                    ).status_code
                    == status.HTTP_200_OK
                )

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_draft_detail_page_when_unauthorized_user(self, user, expected_status, api_client, live_donation_page):
        if user:
            api_client.force_authenticate(user)
        assert (
            api_client.get(
                reverse("donationpage-draft-detail"),
                {"revenue_program": live_donation_page.revenue_program, "page": live_donation_page.slug},
            ).status_code
            == expected_status
        )

    def test_draft_detail_page_revenue_program_not_found(self, superuser, api_client):
        unfound_slug = "unexpected"
        assert not RevenueProgram.objects.filter(slug=unfound_slug).exists()
        api_client.force_authenticate(superuser)
        response = api_client.get(reverse("donationpage-draft-detail"), {"revenue_program": unfound_slug})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Could not find revenue program matching those parameters"}

    def test_draft_detail_page_donation_page_not_found(self, superuser, api_client, live_donation_page):
        api_client.force_authenticate(superuser)
        made_up_page = "made-up-page"
        assert not DonationPage.objects.filter(
            revenue_program=live_donation_page.revenue_program, slug=made_up_page
        ).exists()
        response = api_client.get(
            reverse("donationpage-draft-detail"),
            {"revenue_program": live_donation_page.revenue_program.slug, "page": made_up_page},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Could not find page matching those parameters"}

    def test_draft_detail_page_no_default_donation_page_return_first_available(
        self, superuser, api_client, live_donation_page
    ):
        api_client.force_authenticate(superuser)
        assert live_donation_page.revenue_program.default_donation_page is None
        response = api_client.get(
            reverse("donationpage-draft-detail"), {"revenue_program": live_donation_page.revenue_program.slug}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == DonationPageFullDetailSerializer(live_donation_page).data

    def test_thank_you_redirect_cannot_be_set_on_existing_page_when_not_enabled(
        self, superuser, api_client, live_donation_page
    ):
        api_client.force_authenticate(superuser)
        assert live_donation_page.revenue_program.organization.plan_name == Plans.FREE
        patch_data = {"thank_you_redirect": "https://www.somewhere.com"}
        response = api_client.patch(reverse("donationpage-detail", args=(live_donation_page.id,)), patch_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "thank_you_redirect": ["This organization's plan does not enable assigning a custom thank you URL"]
        }


@pytest.fixture
def create_style_valid_data(live_donation_page):
    return {
        "name": fake.word(),
        "revenue_program": live_donation_page.revenue_program.id,
        "radii": [],
        "font": {},
        "fontSizes": [],
        # see `StyleListSerializer.to_internal_value` to understand how this works. This resource
        # puts arbitrary key/value pairs for styles JSON blob on style instance.
        "foo": "bar",
    }


@pytest.fixture
def create_style_missing_radii(create_style_valid_data):
    data = {**create_style_valid_data}
    del data["radii"]
    return data


@pytest.fixture
def create_style_missing_font(create_style_valid_data):
    data = {**create_style_valid_data}
    del data["font"]
    return data


@pytest.fixture
def create_style_missing_font_sizes(create_style_valid_data):
    data = {**create_style_valid_data}
    del data["fontSizes"]
    return data


@pytest.fixture
def create_style_missing_name(create_style_valid_data):
    data = {**create_style_valid_data}
    del data["name"]
    return data


@pytest.fixture
def create_style_missing_revenue_program(create_style_valid_data):
    data = {**create_style_valid_data}
    del data["revenue_program"]
    return data


@pytest.fixture
def create_style_revenue_program_null(create_style_valid_data):
    return create_style_valid_data | {"revenue_program": None}


@pytest.fixture
def create_style_revenue_program_blank(create_style_valid_data):
    return create_style_valid_data | {"revenue_program": ""}


@pytest.fixture
def patch_style_valid_data_rp_only(revenue_program):
    return {"revenue_program": revenue_program.id}


@pytest.fixture
def patch_style_valid_data_name_only():
    return {"name": "updated-style-name"}


@pytest.fixture
def patch_style_valid_styles_data_only():
    return {
        "radii": [],
        "font": {},
        "fontSizes": [],
    }


@pytest.fixture
def patch_style_valid_styles_data_with_arbitrary_keys(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"foo": "bar"}


@pytest.fixture
def patch_style_valid_data_all_keys(
    patch_style_valid_data_rp_only, patch_style_valid_data_name_only, patch_style_valid_styles_data_with_arbitrary_keys
):
    return (
        patch_style_valid_data_rp_only
        | patch_style_valid_data_name_only
        | patch_style_valid_styles_data_with_arbitrary_keys
    )


@pytest.fixture
def patch_style_invalid_data_bad_radii_is_text(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"radii": "foo"}


@pytest.fixture
def patch_style_invalid_data_bad_radii_is_null(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"radii": None}


@pytest.fixture
def patch_style_invalid_data_bad_radii_is_number(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"radii": 123}


@pytest.fixture
def patch_style_invalid_data_bad_radii_is_unexpected_dict(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"radii": {"foo": "bar"}}


@pytest.fixture
def patch_style_invalid_data_bad_font_is_text(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"font": "foo"}


@pytest.fixture
def patch_style_invalid_data_bad_font_is_null(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"font": None}


@pytest.fixture
def patch_style_invalid_data_bad_font_is_number(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"font": 123}


@pytest.fixture
def patch_style_invalid_data_bad_font_is_list(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"font": []}


@pytest.fixture
def patch_style_invalid_data_bad_font_sizes_is_text(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"fontSizes": "big"}


@pytest.fixture
def patch_style_invalid_data_bad_font_sizes_is_null(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"fontSizes": None}


@pytest.fixture
def patch_style_invalid_data_bad_font_sizes_is_number(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"fontSizes": 123}


@pytest.fixture
def patch_style_invalid_data_bad_font_sizes_is_dict(patch_style_valid_styles_data_only):
    return patch_style_valid_styles_data_only | {"fontSizes": {}}


@pytest.mark.django_db
class TestStyleViewSet:
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_style_when_expected_user_with_valid_data(self, user, api_client, create_style_valid_data):
        """Show that expected users can create a style when provid valid data"""
        before_count = Style.objects.count()
        if not user.is_superuser:
            user.roleassignment.revenue_programs.add(
                rp := RevenueProgram.objects.get(pk=create_style_valid_data["revenue_program"])
            )
            user.roleassignment.save()
            rp.organization = user.roleassignment.organization
            rp.save()
        api_client.force_authenticate(user)
        response = api_client.post(reverse("style-list"), data=create_style_valid_data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Style.objects.count() == before_count + 1
        style = Style.objects.get(pk=response.json()["id"])
        assert (
            style.revenue_program_id
            == response.json()["revenue_program"]["id"]
            == create_style_valid_data["revenue_program"]
        )
        assert style.name == create_style_valid_data["name"] == response.json()["name"]
        passed_style_data = {k: v for k, v in create_style_valid_data.items() if k not in ("name", "revenue_program")}
        assert passed_style_data
        for k, v in passed_style_data.items():
            assert style.styles[k] == v

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_style_when_expected_user_but_not_own_rp(self, user, create_style_valid_data, api_client):
        """Show behavior when expected user tries to create a style pointing to an unowned RP"""
        api_client.force_authenticate(user)
        assert (
            not RevenueProgram.objects.get(pk=create_style_valid_data["revenue_program"])
            in user.roleassignment.revenue_programs.all()
        )
        response = api_client.post(reverse("style-list"), data=create_style_valid_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"revenue_program": ["Not found"]}

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_with_unexpected_role"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_create_style_when_unauthorized_user(self, user, create_style_valid_data, expected_status, api_client):
        """Show behavior when an unauthorized user tries to create a style"""
        if user:
            api_client.force_authenticate(user)
        response = api_client.post(reverse("style-list"), data=create_style_valid_data, format="json")
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "data,expected_response",
        (
            (
                pytest_cases.fixture_ref("create_style_missing_radii"),
                {"styles": ['Style objects must contain a "radii" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("create_style_missing_font"),
                {"styles": ['Style objects must contain a "font" key of type "<class \'dict\'>"']},
            ),
            (
                pytest_cases.fixture_ref("create_style_missing_font_sizes"),
                {"styles": ['Style objects must contain a "fontSizes" key of type "<class \'list\'>"']},
            ),
            (pytest_cases.fixture_ref("create_style_missing_name"), {"name": ["This field may not be null."]}),
            (
                pytest_cases.fixture_ref("create_style_missing_revenue_program"),
                {"revenue_program": ["This field may not be null."]},
            ),
            (
                pytest_cases.fixture_ref("create_style_revenue_program_null"),
                {"revenue_program": ["This field may not be null."]},
            ),
            (
                pytest_cases.fixture_ref("create_style_revenue_program_blank"),
                {"revenue_program": ["This field may not be null."]},
            ),
        ),
    )
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_create_when_invalid_data(self, data, expected_response, user, api_client):
        """Show behavior when an expected user tries to create a style, with various sorts of invalid data"""
        api_client.force_authenticate(user)
        if not user.is_superuser and data.get("revenue_program"):
            user.roleassignment.revenue_programs.add(rp := RevenueProgram.objects.get(pk=data["revenue_program"]))
            user.roleassignment.save()
            rp.organization = user.roleassignment.organization
            rp.save()
        response = api_client.post(reverse("style-list"), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == expected_response

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_retrieve_when_expected_user(self, user, api_client, style, mocker):
        """Show that expected users can retrieve styles they own and cannot those they don't"""
        api_client.force_authenticate(user)
        # ensure some styles non-superusers can't retrieve
        StyleFactory.create_batch(size=3)
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        if user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN:
            query = Style.objects.all()
            assert query.count()
            for x in query.all():
                response = api_client.get(reverse("style-detail", args=(x.id,)))
                assert response.status_code == status.HTTP_200_OK
                assert response.json() == json.loads(json.dumps(StyleListSerializer(x).data))
            assert spy.call_count == 0 if user.is_superuser else 1
        else:
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
            query = Style.objects.filtered_by_role_assignment(user.roleassignment)
            unpermitted = Style.objects.exclude(id__in=query.values_list("id", flat=True))

            assert query.count()
            assert unpermitted.count()

            # the extra one is for call to `filtered_by_role_assignment` just above here
            expect_spy_call_count = query.count() + unpermitted.count() + 1
            for x in query.all():
                response = api_client.get(reverse("style-detail", args=(x.id,)))
                assert response.status_code == status.HTTP_200_OK
                assert response.json() == json.loads(json.dumps(StyleListSerializer(x).data))
            for x in unpermitted.all():
                response = api_client.get(reverse("style-detail", args=(x.id,)))
                assert response.status_code == status.HTTP_404_NOT_FOUND
            assert spy.call_count == expect_spy_call_count

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_retrieve_when_unauthorized_user(self, user, expected_status, style, api_client):
        """Show retrieve behavior when unauthorized user attempts"""
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("style-detail", args=(style.id,)))
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_list_when_expected_user(self, user, api_client, style, mocker):
        """Test that expected users see styles they should and not see those they shouldn't when listing"""
        api_client.force_authenticate(user)
        # ensure some styles non-superusers can't retrieve
        StyleFactory.create_batch(size=3)
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        if user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN:
            query = Style.objects.all()
            assert query.count()
            response = api_client.get(reverse("style-list"))
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == query.count()
            for x in response.json():
                assert x == json.loads(json.dumps(StyleListSerializer(Style.objects.get(pk=x["id"])).data))
            assert spy.call_count == 0 if user.is_superuser else 1
        else:
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
            query = Style.objects.filtered_by_role_assignment(user.roleassignment)
            unpermitted = Style.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            response = api_client.get(reverse("style-list"))
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == query.count()
            for x in response.json():
                assert x["revenue_program"]["id"] in user.roleassignment.revenue_programs.values_list("id", flat=True)
                assert x == json.loads(json.dumps(StyleListSerializer(Style.objects.get(pk=x["id"])).data))
            # once for call above to create `query`, and once when called in view layer
            assert spy.call_count == 2

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_list_when_unauthorized_user(self, user, expected_status, api_client):
        """Show list behavior when an unauthorized user tries to access"""
        StyleFactory.create_batch(size=2)
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("style-list"))
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_cannot_put(self, user, expected_status, api_client, style):
        """Show how nobody puts styles"""
        if user:
            api_client.force_authenticate(user)
        response = api_client.put(reverse("style-detail", args=(style.id,)), data={}, format="json")
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    @pytest_cases.parametrize(
        "data",
        (
            # These are all of the relevant cases *except* for patching revenue program,
            # which we need to handle differently because org and rp user need to be
            # given permissions for rp.
            pytest_cases.fixture_ref("patch_style_valid_styles_data_with_arbitrary_keys"),
            pytest_cases.fixture_ref("patch_style_valid_data_name_only"),
            pytest_cases.fixture_ref("patch_style_valid_styles_data_only"),
        ),
    )
    def test_update_style_when_expected_user_with_valid_data(self, user, data, api_client, style, mocker):
        """Show that expected users can update a style when providing valid data"""
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        if not user.is_superuser and not user.roleassignment.role_type == Roles.HUB_ADMIN:
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
        last_modified = style.modified
        api_client.force_authenticate(user)
        response = api_client.patch(reverse("style-detail", args=(style.pk,)), data=data, format="json")
        assert response.status_code == status.HTTP_200_OK
        style.refresh_from_db()
        assert style.modified > last_modified
        for k, v in {k: v for k, v in data.items() if k not in ("name", "revenue_program")}.items():
            assert style.styles[k] == v
        assert spy.call_count == 0 if user.is_superuser else 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    @pytest_cases.parametrize(
        "data",
        (
            pytest_cases.fixture_ref("patch_style_valid_data_all_keys"),
            pytest_cases.fixture_ref("patch_style_valid_data_rp_only"),
        ),
    )
    def test_update_style_when_expected_user_updating_owned_rp(self, user, data, api_client, style, mocker):
        """Show that expected users can update a style when providing valid data"""
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        to_update_rp = RevenueProgram.objects.get(id=data["revenue_program"])
        if not user.is_superuser and not user.roleassignment.role_type == Roles.HUB_ADMIN:
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
            to_update_rp.organization = user.roleassignment.organization
            to_update_rp.save()
            user.roleassignment.revenue_programs.add(to_update_rp)
        last_modified = style.modified
        api_client.force_authenticate(user)
        response = api_client.patch(reverse("style-detail", args=(style.pk,)), data=data, format="json")
        assert response.status_code == status.HTTP_200_OK
        style.refresh_from_db()
        assert style.modified > last_modified
        assert style.revenue_program.id == data["revenue_program"] == response.json()["revenue_program"]["id"]
        for k, v in {k: v for k, v in data.items() if k not in ("name", "revenue_program")}.items():
            assert style.styles[k] == v
        assert spy.call_count == 0 if user.is_superuser else 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_update_style_when_expected_user_but_not_own_rp(
        self, user, api_client, style, revenue_program, patch_style_valid_data_all_keys
    ):
        api_client.force_authenticate(user)
        style.revenue_program = user.roleassignment.revenue_programs.first()
        style.save()
        assert style.revenue_program != revenue_program
        assert revenue_program not in user.roleassignment.revenue_programs.all()
        data = patch_style_valid_data_all_keys | {"revenue_program": revenue_program.id}
        response = api_client.patch(reverse("style-detail", args=(style.id,)), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"revenue_program": ["Not found"]}

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("hub_admin_user"),
        ),
    )
    def test_update_style_when_expected_rp_not_exist(
        self, user, api_client, style, revenue_program, patch_style_valid_data_all_keys
    ):
        rp_id = revenue_program.id
        assert style.revenue_program.id != rp_id
        revenue_program.delete()
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
        api_client.force_authenticate(user)
        data = patch_style_valid_data_all_keys | {"revenue_program": rp_id}
        response = api_client.patch(reverse("style-detail", args=(style.id,)), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"revenue_program": [f'Invalid pk "{rp_id}" - object does not exist.']}

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_update_style_when_expected_user_but_not_own_style(
        self, user, style, patch_style_valid_data_all_keys, api_client, mocker
    ):
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        assert style.revenue_program not in user.roleassignment.revenue_programs.all()
        api_client.force_authenticate(user)
        response = api_client.patch(
            reverse("style-detail", args=(style.id,)), data=patch_style_valid_data_all_keys, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_update_style_when_unexpected_user(
        self, user, expected_status, patch_style_valid_data_all_keys, style, api_client
    ):
        if user:
            api_client.force_authenticate(user)
        response = api_client.patch(
            reverse("style-detail", args=(style.pk,)), data=patch_style_valid_data_all_keys, format="json"
        )
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            # pytest_cases.fixture_ref("rp_user"),
            # pytest_cases.fixture_ref("superuser"),
            # pytest_cases.fixture_ref("hub_admin_user"),
        ),
    )
    @pytest_cases.parametrize(
        "data,expected_response",
        (
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_radii_is_text"),
                {"styles": ['Style objects must contain a "radii" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_radii_is_null"),
                {"styles": ['Style objects must contain a "radii" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_radii_is_number"),
                {"styles": ['Style objects must contain a "radii" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_radii_is_unexpected_dict"),
                {"styles": ['Style objects must contain a "radii" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_is_text"),
                {"styles": ['Style objects must contain a "font" key of type "<class \'dict\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_is_null"),
                {"styles": ['Style objects must contain a "font" key of type "<class \'dict\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_is_number"),
                {"styles": ['Style objects must contain a "font" key of type "<class \'dict\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_is_list"),
                {"styles": ['Style objects must contain a "font" key of type "<class \'dict\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_sizes_is_text"),
                {"styles": ['Style objects must contain a "fontSizes" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_sizes_is_null"),
                {"styles": ['Style objects must contain a "fontSizes" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_sizes_is_number"),
                {"styles": ['Style objects must contain a "fontSizes" key of type "<class \'list\'>"']},
            ),
            (
                pytest_cases.fixture_ref("patch_style_invalid_data_bad_font_sizes_is_dict"),
                {"styles": ['Style objects must contain a "fontSizes" key of type "<class \'list\'>"']},
            ),
        ),
    )
    def test_update_when_invalid_data(self, user, data, expected_response, style, api_client):
        api_client.force_authenticate(user)
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
        response = api_client.patch(reverse("style-detail", args=(style.id,)), data=data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == expected_response

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_delete_when_expected_user_and_own_style(self, user, style, api_client, mocker):
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        api_client.force_authenticate(user)
        style_id = style.id
        if not (user.is_superuser or user.roleassignment.role_type == Roles.HUB_ADMIN):
            style.revenue_program = user.roleassignment.revenue_programs.first()
            style.save()
        response = api_client.delete(reverse("style-detail", args=(style.id,)))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Style.objects.filter(pk=style_id).exists()
        assert spy.call_count == 0 if user.is_superuser else 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_delete_when_expected_user_and_not_own_style(self, user, api_client, style, mocker):
        spy = mocker.spy(PagesAppQuerySet, "filtered_by_role_assignment")
        api_client.force_authenticate(user)
        assert style.revenue_program not in user.roleassignment.revenue_programs.all()
        response = api_client.delete(reverse("style-detail", args=(style.id,)))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("rp_user"),
        ),
    )
    def test_delete_when_expected_user_and_not_found(self, user, style, api_client):
        api_client.force_authenticate(user)
        style_pk = style.id
        style.delete()
        assert api_client.delete(reverse("style-detail", args=(style_pk,))).status_code == status.HTTP_404_NOT_FOUND

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_delete_when_unexpected_user(self, user, expected_status, style, api_client):
        if user:
            api_client.force_authenticate(user)
        assert api_client.delete(reverse("style-detail", args=(style.pk,))).status_code == expected_status

    def test_unexpected_role_type_cant_list(self, user_with_unexpected_role, api_client):
        api_client.force_authenticate(user_with_unexpected_role)
        response = api_client.get(reverse("style-list"))
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.fixture
def font():
    return FontFactory()


@pytest.mark.django_db
class TestFontViewSet:
    @pytest_cases.parametrize(
        "user,expect_status",
        (
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_200_OK),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_retrieve(self, user, expect_status, font, api_client):
        if user:
            api_client.force_authenticate(user)
        assert api_client.get(reverse("font-detail", args=(font.id,))).status_code == expect_status

    @pytest_cases.parametrize(
        "user,expect_status",
        (
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_200_OK),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_200_OK),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_list(self, user, expect_status, api_client):
        FontFactory.create_batch(size=3)
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("font-list"))
        assert response.status_code == expect_status
        if expect_status == status.HTTP_200_OK:
            assert len(response.json()) == Font.objects.count()

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    @pytest_cases.parametrize("method", ("delete", "put", "patch", "post"))
    def test_unpermitted_methods(self, user, expected_status, method, font, api_client):
        if user:
            api_client.force_authenticate(user)
        assert getattr(api_client, method)(reverse("font-detail", args=(font.id,))).status_code == expected_status
