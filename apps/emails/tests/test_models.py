from unittest.mock import patch

from apps.common.tests.test_resources import AbstractTestCase
from apps.emails.models import EmailTemplateError, PageEmailTemplate
from apps.pages.tests.factories import DonationPageFactory

from .factories import create_default_templates, get_contact_types


class PageTemplateModelTest(AbstractTestCase):
    def setUp(self):
        self.cts = get_contact_types()

    def test_donation_page_has_no_templates(self):
        self.donation_page = DonationPageFactory()
        assert len(self.donation_page.email_templates.all()) == 0

    def test_donation_page_has_all_default_templates(self):
        create_default_templates()
        self.donation_page = DonationPageFactory()
        assert len(self.donation_page.email_templates.all()) == 4

    def test_identifiers(self):
        create_default_templates()
        self.donation_page = DonationPageFactory()
        for pet in self.donation_page.email_templates.all():
            assert str(pet) == f"nrh-default-{pet.template_type.lower()}"

    def test_donation_page_has_default_schema(self):
        create_default_templates([self.cts[0]])
        self.donation_page = DonationPageFactory()
        for pet in self.donation_page.email_templates.all():
            assert pet.schema == PageEmailTemplate.ContactType.default_schema()

    def test_template_returned_for_page(self):
        create_default_templates()
        self.donation_page = DonationPageFactory()
        temp = PageEmailTemplate.get_template("OTD", self.donation_page)
        otd_template = PageEmailTemplate.defaults.filter(template_type="OTD").first()
        assert temp == otd_template

    def test_error_raised_if_template_does_not_exist(self):
        template_created = self.cts[0]
        template_not_created = self.cts[2]
        create_default_templates([template_created])
        self.donation_page = DonationPageFactory()
        self.donation_page.name = "DP1"
        self.donation_page.save()
        with self.assertRaises(EmailTemplateError) as cm:
            PageEmailTemplate.get_template(template_not_created, self.donation_page)

        assert str(cm.exception) == f"No template exists for the page DP1 and type: {template_not_created}"

    def test_update_schema(self):
        create_default_templates()
        default_schema = PageEmailTemplate.ContactType.default_schema()
        self.donation_page = DonationPageFactory()
        for pet in self.donation_page.email_templates.all():
            assert pet.schema["org_name"] == default_schema["org_name"]
            new_schema = default_schema.copy()
            new_schema["org_name"] = "New Org Name"
            pet.update_default_fields(new_schema)
            assert pet.schema["org_name"] != default_schema["org_name"]
            assert pet.schema["org_name"] == new_schema["org_name"]
