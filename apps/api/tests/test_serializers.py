import pytest

from apps.api.serializers import ContributorObtainTokenSerializer
from apps.contributions.tests.factories import ContributorFactory


@pytest.mark.django_db
@pytest.mark.parametrize(
    "data",
    [
        {},
        {"access": "notblank"},
        {"access": "notblank", "subdomain": "ncn"},
        {"access": "notblank", "subdomain": "nCn"},
        {"access": "notblank", "subdomain": ""},
        {"subdomain": " ncn"},  # something strips whitespace
        {"subdomain": "ncn\n"},  # something strips whitespace
    ],
)
def test_good_ContributorObtainTokenSerializer(data):
    contributor = ContributorFactory()
    t = ContributorObtainTokenSerializer(data={"email": contributor.email, **data})
    assert t.is_valid(), t.errors
    t.update_short_lived_token(t.data["contributor"])
    result = t.validated_data
    assert result["access"] not in ("notblank", "", None)  # set to random auth value
    if expected := data.get("subdomain"):
        assert result.get("subdomain") == expected.strip()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "data",
    [
        {"subdomain": "n cn"},  # no whitespace
        {"subdomain": "ex_ample"},  # no underscores
        {"subdomain": "example.com"},  # only subdomain
        {"subdomain": "https://ncn"},  # only a-z, 0-9, -
    ],
)
def test_bad_ContributorObtainTokenSerializer(data):
    contributor = ContributorFactory()
    t = ContributorObtainTokenSerializer(data={"email": contributor.email, **data})
    assert not t.is_valid(), t.errors


@pytest.mark.django_db
def test_contributor_non_existent_ContributorObtainTokenSerializer():
    t = ContributorObtainTokenSerializer(data={"email": "fake@email.com"})
    assert not t.is_valid(), t.errors
