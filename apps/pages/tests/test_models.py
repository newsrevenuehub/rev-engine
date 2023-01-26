import datetime
from unittest import mock

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages import defaults
from apps.pages.models import DefaultPageLogo, DonationPage, _get_screenshot_upload_path
from apps.pages.tests.factories import DonationPageFactory, FontFactory, StyleFactory


def test__get_screenshot_upload_path():
    instance = mock.Mock(name="landing", organization=mock.Mock(name="justiceleague"))
    filename = mock.Mock()
    assert isinstance(_get_screenshot_upload_path(instance, filename), str)


class DonationPageTest(TestCase):
    def setUp(self):
        self.model_class = DonationPage
        self.instance = DonationPageFactory()
        self.org = OrganizationFactory()

    def _create_page_with_default_logo(self):
        default_logo = DefaultPageLogo.get_solo()
        default_logo.logo = get_test_image_file_jpeg()
        default_logo.save()
        page = self.model_class()
        page.revenue_program = self.instance.revenue_program
        page.save()
        return page, default_logo.logo

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))

    def test_organization(self):
        # from AbstractPage
        assert self.instance.revenue_program.organization is self.instance.organization
        self.instance.revenue_program = None
        assert None is self.instance.organization

    def test_is_live(self):
        one_minute = datetime.timedelta(minutes=1)
        # before publish date
        self.instance.published_date = timezone.now() + one_minute
        self.instance.save()
        self.assertFalse(self.instance.is_live)
        # after publish date
        self.instance.published_date = timezone.now() - one_minute
        self.instance.save()
        self.assertTrue(self.instance.is_live)

    def test_new_pages_save_with_default_elements(self):
        default_elements = defaults.get_default_page_elements()
        for i, el in enumerate(self.instance.elements):
            self.assertEqual(el["type"], default_elements[i]["type"])
            if el["type"] != "DDonorAddress":
                self.assertEqual(el["content"], default_elements[i]["content"])

    def test_new_pages_save_with_default_header_logo(self):
        page, default_logo = self._create_page_with_default_logo()
        self.assertEqual(page.header_logo, default_logo)

    def test_pages_can_still_clear_header_logo(self):
        """
        Although we set a default image for the header_logo on create, we still ought to be able to set it empty in subsequent updates.
        """
        page, default_logo = self._create_page_with_default_logo()
        self.assertEqual(page.header_logo, default_logo)
        page.header_logo = ""
        page.save()
        self.assertTrue(not page.header_logo)

    def test_slug_validated_against_denylist(self):
        denied_word = DenyListWordFactory()
        page = DonationPage(name="My page")
        page.slug = denied_word.word
        with self.assertRaises(ValidationError) as validation_error:
            page.clean_fields()

        self.assertIn("slug", validation_error.exception.error_dict)
        self.assertEqual(SLUG_DENIED_CODE, validation_error.exception.error_dict["slug"][0].code)
        self.assertEqual(GENERIC_SLUG_DENIED_MSG, validation_error.exception.error_dict["slug"][0].message)

    def test_cannot_delete_when_related_contributions(self):
        page = DonationPageFactory()
        # TODO: DEV-3026
        with mock.patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            ContributionFactory(donation_page=page)
        with self.assertRaises(ProtectedError) as protected_error:
            page.delete()
        error_msg = (
            "Cannot delete some instances of model 'DonationPage' because they are referenced through protected "
            "foreign keys: 'Contribution.donation_page'."
        )
        self.assertEqual(error_msg, protected_error.exception.args[0])


class StyleTest(TestCase):
    def setUp(self):
        self.instance = StyleFactory()

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))

    # def test_user_has_ownership_via_role(self):
    #     # TODO: test actual conditions
    #     ra = mock.MagicMock()
    #     permision = self.instance.user_has_ownership_via_role(ra)
    #     assert isinstance(permision, bool)


class FontTest(TestCase):
    def test_to_string(self):
        t = FontFactory(name="bob", source="bigboys")
        assert "bob (bigboys)" == str(t)


class DefaultPageLogoTest(TestCase):
    def test_to_string(self):
        t = DefaultPageLogo()
        assert "Default Page Logo" == str(t)
