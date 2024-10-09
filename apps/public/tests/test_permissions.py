from unittest.mock import MagicMock

from django.contrib.auth import get_user_model

import pytest

from apps.public.permissions import IsActiveSuperUser


user_model = get_user_model()


class IsActiveSuperUserPermissionTest:

    @pytest.fixture
    def regular_user(self):
        return user_model.objects.create_user(email="regularuser@test.com", password="testing")

    @pytest.fixture
    def superuser_inactive(self, superuser):
        superuser.is_active = False
        superuser.save()
        superuser.refresh_from_db()
        return superuser

    def _create_request_for_user(self, user):
        request = MagicMock()
        request.user = user
        return request

    @pytest.mark.parametrize(
        ("user_fixture_name", "expected"),
        [
            ("superuser", True),
            ("regular_user", False),
            ("superuser_inactive", False),
        ],
    )
    def test_permission(self, user_fixture_name, expected, request):
        assert (
            IsActiveSuperUser().has_permission(
                self._create_request_for_user(request.getfixturevalue(user_fixture_name))
            )
            is expected
        )
