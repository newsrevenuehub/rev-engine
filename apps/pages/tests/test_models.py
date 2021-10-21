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


class StyleTest(TestCase):
    def setUp(self):
        self.instance = StyleFactory()

    def test_to_string(self):
        self.assertEqual(self.instance.name, str(self.instance))
