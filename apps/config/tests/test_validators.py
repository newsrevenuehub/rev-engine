from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import (
    GENERIC_SLUG_DENIED_MSG,
    SLUG_DENIED_CODE,
    validate_slug_against_denylist,
)


class DenyListValidationTest(TestCase):
    def setUp(self):
        dlw = DenyListWordFactory()
        self.bad_word = dlw.word

    def test_bad_word_raises_validation_error(self):
        with self.assertRaises(ValidationError) as v_error:
            validate_slug_against_denylist(self.bad_word)

        self.assertEqual(v_error.exception.message, GENERIC_SLUG_DENIED_MSG)
        self.assertEqual(v_error.exception.code, SLUG_DENIED_CODE)

    def test_good_word_passes_validation(self):
        good_word = "flowers"
        self.assertNotEqual(good_word, self.bad_word)

        self.assertIsNone(validate_slug_against_denylist(good_word))

    def test_validates_case_insensitive(self):
        with self.assertRaises(ValidationError) as v_error:
            validate_slug_against_denylist(self.bad_word.upper())

        self.assertEqual(v_error.exception.message, GENERIC_SLUG_DENIED_MSG)
        self.assertEqual(v_error.exception.code, SLUG_DENIED_CODE)
