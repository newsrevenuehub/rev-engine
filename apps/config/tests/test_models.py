from apps.config.models import DenyListWord


class TestDenyListWord:
    def test_basics(self):
        t = DenyListWord(word="z0mg")
        assert "z0mg" == str(t)
