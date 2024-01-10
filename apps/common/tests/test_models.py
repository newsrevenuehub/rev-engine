import pytest

from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestSocialMeta:
    def test_string(self):
        rp = RevenueProgramFactory()
        assert str(rp.socialmeta) == f"Social media Metatags for RevenueProgram: {rp.name}"
