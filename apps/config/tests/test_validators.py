from django.db.utils import IntegrityError

import pytest

from apps.config.models import DenyListWord
from apps.config.tests.factories import DenyListWordFactory
from apps.config.validators import validate_slug_against_denylist


@pytest.mark.django_db()
class TestDenylistValidation:
    @pytest.fixture()
    def word(self):
        return DenyListWordFactory()

    @pytest.mark.parametrize("case", ["lower", "upper"])
    def test_case_insensitive_uniqueness(self, word, case):
        with pytest.raises(IntegrityError):
            DenyListWord.objects.create(word=getattr(word.word, case)())

    def test_retrieval_case_insensitivity(self, word):
        word_lower = DenyListWord.objects.get(word=word.word.lower())
        word_upper = DenyListWord.objects.get(word=word.word.upper())
        assert word_lower == word_upper

    def validate_slug_against_denylist_fails_existing(self, word):
        with pytest.raises(IntegrityError):
            validate_slug_against_denylist(word)

    def validate_slug_against_denylist_passes_nonexistent(self, word):
        validate_slug_against_denylist(word + "extra")
