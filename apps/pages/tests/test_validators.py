from django.core.exceptions import ValidationError
from django.test import TestCase

import pytest

from apps.pages.validators import required_style_keys, style_validator


class StyleValidatorTest(TestCase):
    def test_successful_validation(self):
        styles_json = {}
        for k, v in required_style_keys.items():
            styles_json[k] = v()
        assert style_validator(styles_json) is None

    def test_fails_when_missing_keys(self):
        styles_json = {}
        with pytest.raises(ValidationError) as exc:
            style_validator(styles_json)
        for k, v in required_style_keys.items():
            assert f'Style objects must contain a "{k}" key of type "{v}"' in exc.value

    def test_fails_when_type_mismatch(self):
        styles_json = {}
        for k in required_style_keys:
            styles_json[k] = ()
        with pytest.raises(ValidationError) as exc:
            style_validator(styles_json)
        for k, v in required_style_keys.items():
            assert f'Style objects must contain a "{k}" key of type "{v}"' in exc.value
