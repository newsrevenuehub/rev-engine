from django.db.utils import IntegrityError

import pytest

from apps.config.models import DenyListWord
from apps.config.tests.factories import DenyListWordFactory


@pytest.mark.django_db
class TestDenyListWord:
    @pytest.fixture()
    def word(self):
        return DenyListWordFactory()

    @pytest.mark.parametrize("case", ["lower", "upper"])
    def test_case_insensitive_uniqueness(self, word, case):
        with pytest.raises(IntegrityError):
            DenyListWord.objects.create(word=getattr(word.text, case)())

    def test_retrieval_case_insensitivity(self, word):
        word_lower = DenyListWord.objects.get(word=word.text.lower())
        word_upper = DenyListWord.objects.get(word=word.text.upper())
        assert word_lower == word_upper
