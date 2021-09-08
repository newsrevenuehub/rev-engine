from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.pages.validators import required_style_keys, style_validator


class StyleValidatorTest(TestCase):
    def test_successful_validation(self):
        styles_json = {}
        for k, v in required_style_keys.items():
            styles_json[k] = v()
        self.assertIsNone(style_validator(styles_json))

    def test_fails_when_missing_keys(self):
        styles_json = {}
        with self.assertRaises(ValidationError) as v_error:
            style_validator(styles_json)

        for k, v in required_style_keys.items():
            self.assertIn(f'Style objects must contain a "{k}" key of type "{v}"', v_error.exception)

    def test_fails_when_type_mismatch(self):
        styles_json = {}
        for k, v in required_style_keys.items():
            styles_json[k] = tuple()

        with self.assertRaises(ValidationError) as v_error:
            style_validator(styles_json)

        for k, v in required_style_keys.items():
            self.assertIn(f'Style objects must contain a "{k}" key of type "{v}"', v_error.exception)
