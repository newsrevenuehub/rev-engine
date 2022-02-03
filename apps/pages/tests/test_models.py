import datetime

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages import defaults
from apps.pages.models import DefaultPageLogo, DonationPage
from apps.pages.tests.factories import DonationPageFactory, StyleFactory


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
        # just use factory-made page's org for this new org.
        page.organization = self.instance.organization
        page.save()
        return page, default_logo.logo

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))

    def test_is_live(self):
        one_minute = datetime.timedelta(minutes=1)
        self.instance.published_date = timezone.now() - one_minute
        self.instance.save()

        self.assertTrue(self.instance.is_live)

        self.instance.published_date = timezone.now() + one_minute
        self.instance.save()

        self.assertFalse(self.instance.is_live)

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
        page = DonationPage(name="My page", organization=self.org)
        page.slug = denied_word.word
        with self.assertRaises(ValidationError) as validation_error:
            page.clean_fields()

        self.assertIn("slug", validation_error.exception.error_dict)
        self.assertEqual(SLUG_DENIED_CODE, validation_error.exception.error_dict["slug"][0].code)
        self.assertEqual(GENERIC_SLUG_DENIED_MSG, validation_error.exception.error_dict["slug"][0].message)


class StyleTest(TestCase):
    def setUp(self):
        self.instance = StyleFactory()

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))
