from django.contrib.auth import get_user_model

import pytest


pytestmark = pytest.mark.django_db


def test_example():
    User = get_user_model()
    assert User.objects.count() == 0
