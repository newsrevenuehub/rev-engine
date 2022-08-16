import datetime
from unittest import mock

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

import pytest
import rest_framework

from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import GENERIC_SLUG_DENIED_MSG, SLUG_DENIED_CODE
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.models import Feature
from apps.organizations.tests.factories import FeatureFactory, OrganizationFactory
from apps.pages import defaults
from apps.pages.models import (
    DefaultPageLogo,
    DonationPage,
    Style,
    Template,
    _get_screenshot_upload_path,
)
from apps.pages.tests.factories import DonationPageFactory, FontFactory, StyleFactory
from apps.users.choices import Roles


def test__get_screenshot_upload_path():
    instance = mock.Mock(name="landing", organization=mock.Mock(name="justiceleague"))
    filename = mock.Mock()
    assert isinstance(_get_screenshot_upload_path(instance, filename), str)


@pytest.mark.parametrize(
    "expected, role, rp",
    [
        (True, Roles.HUB_ADMIN, None),  # Always HubAdmin
        (True, Roles.ORG_ADMIN, mock.Mock(organization="yes_org")),  # Organization Admin onlyif org matches
        (False, Roles.ORG_ADMIN, mock.Mock(organization="no_org")),  # Organization Admin onlyif org matches
        (False, Roles.ORG_ADMIN, None),  # Organization Admin onlyif org matches
        (True, Roles.RP_ADMIN, "yes_rp"),  # Revenue Program Admin onlyif admin for that RP
        (False, Roles.RP_ADMIN, "no_rp"),  # Revenue Program Admin onlyif admin for that RP
        (False, Roles.RP_ADMIN, None),  # Revenue Program Admin onlyif admin for that RP
        (False, None, None),  # Never roleless yahoos.
        (False, None, mock.Mock(organization="yesorg")),  # Never roleless yahoos.
    ],
)
def test_user_has_delete_permission_by_virtue_of_role(expected, role, rp):
    user = mock.Mock()
    user.roleassignment = mock.Mock(
        role_type=role,
        organization="yes_org",
        revenue_programs=mock.Mock(
            all=lambda: [
                "yes_rp",
            ]
        ),
    )
    instance = mock.Mock(revenue_program=rp)
    assert expected == DonationPage.user_has_delete_permission_by_virtue_of_role(user, instance)
    assert expected == Template.user_has_delete_permission_by_virtue_of_role(user, instance)
    assert expected == Style.user_has_delete_permission_by_virtue_of_role(user, instance)


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

    def test_new_save_page_limits_error(self):
        page = self.model_class()
        page.has_page_limit = mock.Mock(
            return_value=FeatureFactory(feature_value=1, feature_type=Feature.FeatureType.PAGE_LIMIT)
        )
        page.revenue_program = self.instance.revenue_program
        with pytest.raises(rest_framework.exceptions.ValidationError) as e:
            page.save()
            assert "reached its limit of" in str(e)

    def test_existing_save_page_limits_no_exception(self):
        self.instance.has_page_limit = mock.Mock(
            return_value=FeatureFactory(feature_value=1, feature_type=Feature.FeatureType.PAGE_LIMIT)
        )
        self.instance.save()

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

    def test_user_has_ownership_via_role(self):
        # TODO: test actual conditions
        ra = mock.MagicMock()
        permision = self.instance.user_has_ownership_via_role(ra)
        assert isinstance(permision, bool)


class FontTest(TestCase):
    def test_to_string(self):
        t = FontFactory(name="bob", source="bigboys")
        assert "bob (bigboys)" == str(t)


class DefaultPageLogoTest(TestCase):
    def test_to_string(self):
        t = DefaultPageLogo()
        assert "Default Page Logo" == str(t)
