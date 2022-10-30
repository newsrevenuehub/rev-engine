from unittest import mock
from unittest.mock import MagicMock

import pytest


@pytest.fixture(autouse=True)
def dont_use_ssl(settings):
    settings.SECURE_SSL_REDIRECT = False


@pytest.fixture(autouse=True)
def patch_google_cloud_pub_sub_publisher(request):
    marker = request.node.get_closest_marker("no_patch_google_cloud_pub_sub_publisher")
    if marker:
        yield
    else:
        with mock.patch("apps.google_pub_sub.publisher.GoogleCloudPubSubPublisher.publish", MagicMock()):
            yield
