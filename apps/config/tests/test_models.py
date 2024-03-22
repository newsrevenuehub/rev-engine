import pytest

from apps.config.models import DenyListWord


@pytest.mark.django_db
class TestDenyListWord:
    text = "z0mg"

    @pytest.fixture
    def word(self):
        return DenyListWord(word=self.text)

    def test_basics(self, word):
        assert str(word) == self.text

    def test_case_sensitive(self, word):
        assert word.word != (new_text := self.text.capitalize())
        DenyListWord(word=new_text).save()
