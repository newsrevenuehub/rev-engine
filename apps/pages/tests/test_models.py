import datetime
import json

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.utils.text import slugify

import pytest

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.tests.factories import ContributionFactory
from apps.google_cloud.pubsub import Message
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages import defaults
from apps.pages.models import DefaultPageLogo, DonationPage, Style, _get_screenshot_upload_path
from apps.pages.tests.factories import DonationPageFactory, FontFactory, StyleFactory
from apps.users.choices import Roles


def test__get_screenshot_upload_path(mocker):
    instance = mocker.Mock(name="landing", organization=mocker.Mock(name="justiceleague"))
    filename = mocker.Mock()
    assert isinstance(_get_screenshot_upload_path(instance, filename), str)
    assert (
        _get_screenshot_upload_path(instance, filename)
        == f"{instance.organization.name}/page_screenshots/{instance.name}_"
        f"{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')}.png"
    )


@pytest.fixture
def default_logo(test_jpeg_file):
    default_logo = DefaultPageLogo.get_solo()
    default_logo.logo = test_jpeg_file
    default_logo.save()
    return default_logo


@pytest.fixture
def donation_page_no_published_date():
    return DonationPageFactory(published_date=None)


@pytest.fixture
def donation_with_published_date():
    return DonationPageFactory(published_date=datetime.datetime.now(datetime.timezone.utc))


@pytest.mark.django_db
class TestDonationPage:
    @pytest.fixture(
        params=[
            "hub_admin_user",
            "org_user_free_plan",
            "rp_user",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_filtered_by_role_assignment(self, user, revenue_program):
        # this will be viewable by all three users
        one = DonationPageFactory(revenue_program=revenue_program)
        # this will be viewable by hub admin and org user, but not rp
        two = DonationPageFactory(revenue_program=RevenueProgramFactory(organization=revenue_program.organization))
        # this will be vieweable by only hub admin
        three = DonationPageFactory(revenue_program=RevenueProgramFactory())
        match user.roleassignment.role_type:
            case Roles.HUB_ADMIN:
                expected = [one.id, two.id, three.id]
            case Roles.ORG_ADMIN:
                user.roleassignment.organization = one.revenue_program.organization
                user.roleassignment.save()
                expected = [one.id, two.id]
            case Roles.RP_ADMIN:
                user.roleassignment.organization = one.revenue_program.organization
                user.roleassignment.revenue_programs.set([one.revenue_program])
                user.roleassignment.save()
                expected = [
                    one.id,
                ]
        query = DonationPage.objects.filtered_by_role_assignment(user.roleassignment)
        assert query.count() == len(expected)
        assert set(query.values_list("id", flat=True)) == set(expected)

    def test_to_string(self):
        page = DonationPageFactory(name=(name := "My page"))
        assert str(page) == page.name == name

    def test_organization(self):
        page = DonationPageFactory()
        assert page.organization == page.revenue_program.organization
        page.revenue_program = None
        assert page.organization is None

    @pytest.mark.parametrize(
        ("published_date", "expected"),
        [
            (timezone.now() - datetime.timedelta(minutes=20), True),
            (timezone.now() + datetime.timedelta(minutes=20), False),
        ],
    )
    def test_is_live(self, published_date, expected):
        assert DonationPageFactory(published_date=published_date).is_live is expected

    def test_new_save_with_default_elements(self):
        default_elements = defaults.get_default_page_elements()
        for i, el in enumerate(DonationPageFactory().elements):
            assert el["type"] == default_elements[i]["type"]
            if el["type"] != "DDonorAddress":
                assert el["content"] == default_elements[i]["content"]

    def test_new_save_with_default_header_logo(self, default_logo):
        assert DonationPageFactory().header_logo == default_logo.logo

    def test_can_still_clear_header_logo(self):
        """Although we set a default image for the header_logo on create.

        We still ought to be able to set it empty in subsequent updates.
        """
        page = DonationPageFactory()
        page.header_logo = ""
        page.save()
        assert page.header_logo == ""

    def test_slug_validated_against_denylist(self):
        page = DonationPageFactory(slug=DenyListWordFactory().word)
        with pytest.raises(ValidationError) as validation_error:
            page.clean_fields()
        assert "slug" in validation_error.value.error_dict
        assert validation_error.value.error_dict["slug"][0].code == SLUG_DENIED_CODE
        assert validation_error.value.error_dict["slug"][0].message == GENERIC_SLUG_DENIED_MSG

    def test_cannot_delete_when_related_contributions(self, mocker):
        page = DonationPageFactory()
        ContributionFactory(donation_page=page)
        with pytest.raises(ProtectedError) as protected_error:
            page.delete()
        assert protected_error.value.args[0] == (
            "Cannot delete some instances of model 'DonationPage' because they are referenced through protected "
            "foreign keys: 'Contribution.donation_page'."
        )

    def test_duplicate_has_different_id_and_name(self):
        original = DonationPageFactory()
        dupe = original.duplicate()
        assert dupe.id != original.id
        assert dupe.name != original.name

    def test_duplicate_has_correct_slug(self):
        original = DonationPageFactory()
        dupe = original.duplicate()
        assert dupe.slug == slugify(dupe.name)

    def test_duplicate_always_unpublished(self):
        original = DonationPageFactory()
        original.published_date = "2001-01-01"
        original.save()
        dupe = original.duplicate()
        assert not dupe.published_date

    @pytest.mark.parametrize("field_name", ["graphic", "header_bg_image", "header_logo", "page_screenshot"])
    def test_duplicate_has_different_image_path_but_same_content(self, field_name, default_logo):
        original = DonationPageFactory()
        setattr(original, field_name, default_logo.logo)
        original.save()
        dupe = original.duplicate()
        dupe_field = getattr(dupe, field_name)
        assert dupe_field.url != default_logo.logo.url
        assert dupe_field.read() == default_logo.logo.read()

    def test_duplicate_has_different_styles_but_same_content(self):
        original = DonationPageFactory()
        original.styles = StyleFactory()
        original.save()
        dupe = original.duplicate()
        assert dupe.styles != original.styles
        assert dupe.styles.styles == original.styles.styles

    def test_duplicate_has_correct_values(self):
        original = DonationPageFactory()
        original.save()
        dupe = original.duplicate()
        for field in [
            "elements",
            "header_link",
            "header_logo_alt_text",
            "heading",
            "locale",
            "post_thank_you_redirect",
            "revenue_program",
            "sidebar_elements",
            "thank_you_redirect",
        ]:
            assert getattr(original, field) == getattr(dupe, field)

    @pytest.mark.parametrize(
        ("site_url", "root"),
        [
            # Real-life examples
            ("https://engine.fundjournalism.org", "fundjournalism.org"),
            ("https://engine.revengine-staging.org", "revengine-staging.org"),
            ("https://dev-4220.revengine-review.org", "revengine-review.org"),
            # Edge cases
            ("https://fundjournalism.org", "fundjournalism.org"),
            ("engine.fundjournalism.org", "fundjournalism.org"),
            ("fundjournalism.org", "fundjournalism.org"),
        ],
    )
    def test_page_url(self, site_url, root, settings):
        settings.SITE_URL = site_url
        revenue_program = RevenueProgramFactory()
        page = DonationPageFactory(revenue_program=revenue_program)
        assert page.page_url == f"https://{revenue_program.slug}.{root}/{page.slug}"

    @pytest.fixture(
        params=[
            ("donation_page_no_published_date", None, False),
            ("donation_with_published_date", "donation_page_no_published_date", True),
            ("donation_with_published_date", "donation_with_published_date", False),
        ]
    )
    def first_publication_case(self, request):
        return (
            request.getfixturevalue(request.param[0]),
            request.getfixturevalue(request.param[1]) if request.param[1] else None,
            request.param[2],
        )

    def test_first_publication_signal(self, first_publication_case, mocker):
        page, value_from_db, expected = first_publication_case
        mocker.patch("apps.pages.models.DonationPage.objects.get", return_value=value_from_db)
        assert page.should_send_first_publication_signal() == expected

    @pytest.mark.parametrize(
        ("get_page_fn", "expect_published"),
        [
            (lambda: DonationPageFactory(published_date=timezone.now()), True),
            (lambda: DonationPageFactory(published_date=None), False),
        ],
    )
    def test_first_published_pub_sub_behavior_when_pubsub_configured(self, get_page_fn, expect_published, mocker):
        topic_name = "some-topic"
        mocker.patch("apps.pages.signals.Publisher.get_instance", return_value=(mock_publisher := mocker.Mock()))
        mocker.patch("apps.pages.signals.google_cloud_pub_sub_is_configured", return_value=True)
        mocker.patch("apps.pages.signals.settings.PAGE_PUBLISHED_TOPIC", (topic_name := topic_name))
        page = get_page_fn()
        if expect_published:
            mock_publisher.publish.assert_called_once_with(
                topic_name,
                Message(
                    json.dumps(
                        {
                            "page_id": page.pk,
                            "url": page.page_url,
                            "publication_date": str(page.published_date),
                            "revenue_program_id": page.revenue_program.pk,
                            "revenue_program_name": page.revenue_program.name,
                            "revenue_program_slug": page.revenue_program.slug,
                        }
                    )
                ),
            )
        else:
            mock_publisher.publish.assert_not_called()


@pytest.mark.django_db
class TestStyle:
    def test_to_string(self, style):
        assert style.name == str(style)

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "org_user_free_plan",
            "rp_user",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_duplicate_has_different_id_and_name(self):
        original = StyleFactory()
        dupe = original.duplicate()
        assert dupe.id != original.id
        assert dupe.name != original.name

    def test_duplicate_has_same_styles(self):
        original = StyleFactory()
        dupe = original.duplicate()
        assert original.styles == dupe.styles

    def test_style_filtered_by_role_assignment(self, user, revenue_program):
        # this will be viewable by all three users
        one = StyleFactory(revenue_program=revenue_program)
        # this will be viewable by hub admin and org user, but not rp
        two = StyleFactory(revenue_program=RevenueProgramFactory(organization=revenue_program.organization))
        # this will be vieweable by only hub admin
        three = StyleFactory(revenue_program=RevenueProgramFactory())
        match user.roleassignment.role_type:
            case Roles.HUB_ADMIN:
                expected = [one.id, two.id, three.id]
            case Roles.ORG_ADMIN:
                user.roleassignment.organization = one.revenue_program.organization
                user.roleassignment.save()
                expected = [one.id, two.id]
            case Roles.RP_ADMIN:
                user.roleassignment.organization = one.revenue_program.organization
                user.roleassignment.revenue_programs.set([one.revenue_program])
                user.roleassignment.save()
                expected = [
                    one.id,
                ]
        query = Style.objects.filtered_by_role_assignment(user.roleassignment)
        assert query.count() == len(expected)
        assert set(query.values_list("id", flat=True)) == set(expected)


@pytest.mark.django_db
class TestFont:
    def test_to_string(self):
        font = FontFactory(name=(name := "bob"), source=(source := "bigboys"))
        assert str(font) == f"{name} ({source})"


class TestDefaultPageLogo:
    def test_to_string(self):
        t = DefaultPageLogo()
        assert str(t) == "Default Page Logo"
