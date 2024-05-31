from django.core.exceptions import ValidationError
from django.test import TestCase

import pytest

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
        with pytest.raises(ValidationError) as exc:
            validate_slug_against_denylist(self.bad_word)
        assert exc.value.message == GENERIC_SLUG_DENIED_MSG
        assert exc.value.code == SLUG_DENIED_CODE

    def test_good_word_passes_validation(self):
        good_word = "flowers"
        assert good_word != self.bad_word
        assert validate_slug_against_denylist(good_word) is None

    def test_validates_case_insensitive(self):
        with pytest.raises(ValidationError) as exc:
            validate_slug_against_denylist(self.bad_word.upper())
        assert exc.value.message == GENERIC_SLUG_DENIED_MSG
        assert exc.value.code == SLUG_DENIED_CODE
