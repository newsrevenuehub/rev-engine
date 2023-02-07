import pytest

from apps.organizations.tests.factories import PaymentProviderFactory


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture
def verified_payment_provider():
    return PaymentProviderFactory(verified_with_stripe=True)


@pytest.fixture
def unverified_payment_provider():
    return PaymentProviderFactory(unverified_with_stripe=True)
