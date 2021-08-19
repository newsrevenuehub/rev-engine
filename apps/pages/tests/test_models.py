import datetime

from django.test import TestCase
from django.utils import timezone

from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory, StyleFactory


class DonationPageTest(TestCase):
    def setUp(self):
        self.model_class = DonationPage
        self.instance = DonationPageFactory()

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

    def test_save_as_template(self):
        # without name arugment, uses page.heading for template.name
        template, _ = self.instance.save_as_template()

        self.assertEqual(template.name, self.instance.name)

        # with name argument, uses that for template.name
        new_name = "My New Template"
        template, _ = self.instance.save_as_template(name=new_name)

        self.assertEqual(template.name, new_name)


class StyleTest(TestCase):
    def setUp(self):
        self.instance = StyleFactory()

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))
