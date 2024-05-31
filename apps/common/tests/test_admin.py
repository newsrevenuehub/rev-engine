from django.urls import reverse

import pytest

from ..admin import prettify_json_field


@pytest.mark.parametrize("input_", [None, {}, {"foo": "bar"}, {"foo": {"bar": "bizz"}}, True, []])
def test_prettify_json_field(input_):
    output = prettify_json_field(input_)
    assert isinstance(output, str)
    assert len(output)
    # minimal way to show some formatting happened and not just string conversion
    assert str(input_) != output


def test_revision_no_error_on_search(admin_client):
    revision_url = reverse("admin:reversion_revision_changelist")
    response = admin_client.get(revision_url, {"q": "test search"})
    assert response.status_code == 200


def test_version_no_error_on_search(admin_client):
    revision_url = reverse("admin:reversion_version_changelist")
    response = admin_client.get(revision_url, {"q": "test search"})
    assert response.status_code == 200
