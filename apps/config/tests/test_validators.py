from django.core.exceptions import ValidationError

import pytest

from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import (
    GENERIC_SLUG_DENIED_MSG,
    SLUG_DENIED_CODE,
    validate_slug_against_denylist,
)


@pytest.mark.django_db()
class TestDenylistValidation:

    @pytest.fixture()
    def deny_list_word(self):
        return DenyListWordFactory()

    def test_bad_word_raises_validation_error(self, deny_list_word):
        with pytest.raises(ValidationError) as v_error:
            validate_slug_against_denylist(deny_list_word.word)

        assert v_error.value.message == GENERIC_SLUG_DENIED_MSG
        assert v_error.value.code == SLUG_DENIED_CODE

    def test_good_word_passes_validation(self, deny_list_word):
        good_word = "flowers"
        assert good_word != deny_list_word.word
        assert validate_slug_against_denylist(good_word) is None

    def test_validates_case_insensitive(self, deny_list_word):
        with pytest.raises(ValidationError) as v_error:
            validate_slug_against_denylist(deny_list_word.word.upper())

        assert v_error.value.message == GENERIC_SLUG_DENIED_MSG
        assert v_error.value.code == SLUG_DENIED_CODE
