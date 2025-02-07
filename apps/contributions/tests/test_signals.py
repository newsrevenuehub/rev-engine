import pytest

from apps.contributions.signals import handle_payment_post_save


@pytest.mark.django_db
@pytest.mark.parametrize("created", [True, False])
def test_handle_payment_post_save(mocker, created):
    payment = mocker.MagicMock()
    handle_payment_post_save(None, payment, created=created)
    assert payment.publish_payment_created.called == created
    assert payment.publish_payment_updated.called == (not created)
