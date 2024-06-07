from django.db.utils import IntegrityError

import pytest

from apps.config.models import DenyListWord
from apps.config.tests.factories import DenyListWordFactory


@pytest.mark.django_db()
class TestDenylistValidation:
    @pytest.fixture()
    def word(self):
        return DenyListWordFactory()

    @pytest.mark.parametrize("case", ["lower", "upper"])
    def test_case_insensitive_uniqueness(self, word, case):
        with pytest.raises(IntegrityError):
            DenyListWord.objects.create(word=getattr(word.word, case)())
