import pytest

from apps.google_cloud.pubsub import Message
from apps.users.signals import user_post_save_handler
from apps.users.tests.factories import create_test_user


@pytest.mark.parametrize(
    ("gcloud_configured", "created", "user_topic"),
    [
        (False, False, "topic"),
        (False, True, "topic"),
        (True, False, "topic"),
        (True, True, None),
        (True, True, "topic"),
    ],
)
@pytest.mark.django_db
def test_user_post_save_handler(gcloud_configured, created, user_topic, monkeypatch, mocker):
    publisher = mocker.patch("apps.users.signals.Publisher")
    user_topic = "topic"
    monkeypatch.setattr("django.conf.settings.NEW_USER_TOPIC", user_topic)
    monkeypatch.setattr("django.conf.settings.ENABLE_PUBSUB", "True")
    instance = mocker.MagicMock()
    publisher.get_instance.return_value = instance
    user = create_test_user()
    user_post_save_handler(sender=mocker.MagicMock(), instance=user, created=created)
    if not gcloud_configured or not created or not user_topic:
        assert not publisher.called
    elif gcloud_configured:
        instance.publish.assert_called_with(user_topic, Message(data=user.email))
