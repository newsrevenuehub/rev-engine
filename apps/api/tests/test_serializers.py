import faker
import pytest

import apps
from apps.api.serializers import ContributorObtainTokenSerializer


fake = faker.Faker()
contributor = apps.contributions.models.Contributor(
    email="bob@example.com",
    uuid=fake.uuid4(),
)


@pytest.mark.parametrize(
    "data",
    [
        {"email": "bob@example.com"},
        {"email": "bob@example.com", "access": "notblank"},
        {"email": "bob@example.com", "access": "notblank", "subdomain": "ncn"},
        {"email": "bob@example.com", "access": "notblank", "subdomain": "nCn"},
        {"email": "bob@example.com", "access": "notblank", "subdomain": ""},
        {"email": "bob@example.com", "subdomain": " ncn"},  # something strips whitespace
        {"email": "bob@example.com", "subdomain": "ncn\n"},  # something strips whitespace
    ],
)
def test_good_ContributorObtainTokenSerializer(data):
    t = ContributorObtainTokenSerializer(data=data)
    assert t.is_valid(), t.errors
    t.update_short_lived_token(contributor)
    result = t.validated_data
    assert result["access"] not in ("notblank", "", None)  # set to random auth value
    if expected := data.get("subdomain"):
        assert result.get("subdomain") == expected.strip()


@pytest.mark.parametrize(
    "data",
    [
        {"email": "bob@example.com", "subdomain": "n cn"},  # no whitespace
        {"email": "bob@example.com", "subdomain": "ex_ample"},  # no underscores
        {"email": "bob@example.com", "subdomain": "example.com"},  # only subdomain
        {"email": "bob@example.com", "subdomain": "https://ncn"},  # only a-z, 0-9, -
    ],
)
def test_bad_ContributorObtainTokenSerializer(data):
    t = ContributorObtainTokenSerializer(data=data)
    assert not t.is_valid(), t.errors
