from django.db.utils import IntegrityError

import pytest

from apps.config.models import DenyListWord


@pytest.mark.django_db
class TestDenyListWord:
    text = (token := "z0mg") + token.upper()

    def test_case_insensitive_uniqueness(self):
        # Create a DenyListWord instance
        DenyListWord.objects.create(word=self.text.lower())
        # Attempt to create another DenyListWord with different casing
        with pytest.raises(IntegrityError):
            DenyListWord.objects.create(word=self.text.upper())

    def test_retrieval_case_insensitivity(self):
        # Create a DenyListWord instance
        DenyListWord.objects.create(word=self.text)
        # Retrieve using different casing
        word_lower = DenyListWord.objects.get(word=self.text.lower())
        word_upper = DenyListWord.objects.get(word=self.text.upper())
        assert word_lower == word_upper

    def test_insertion_case_insensitivity(self):
        # Insert a word
        word = DenyListWord.objects.create(word=self.text.lower())
        # Ensure the word can be retrieved with different casing
        inserted_word = DenyListWord.objects.get(word=self.text.upper())
        assert inserted_word.word == word.word
