from unittest import mock

import pytest
from rest_framework import serializers

from apps.common.validators import ValidateFkReferenceOwnership


class TestValidateFkReferenceOwnership:
    def test_good_has_default_access_fn(self):
        ValidateFkReferenceOwnership("", lambda user, role_assignment: False)

    @pytest.mark.parametrize(
        "fn",
        [
            lambda: False,
            lambda user: False,
            lambda role_assignment: False,
            lambda *args, **kwargs: False,
        ],
    )
    def test_bad_has_default_access_fn(self, fn):
        with pytest.raises(serializers.ValidationError) as e:
            ValidateFkReferenceOwnership("", fn)
            assert "unexpected signature" in str(e)

    def test_no_user(self):
        t = ValidateFkReferenceOwnership("")
        value = {}
        serializer = mock.Mock(
            model=mock.Mock(__name__="NoModel"), context=mock.Mock(get=mock.Mock(return_value=mock.Mock(user=None)))
        )
        with pytest.raises(serializers.ValidationError) as e:
            t(value, serializer)
        assert "relationship of requesting user to request" in str(e)

    def test_no_roleassignment(self):
        t = ValidateFkReferenceOwnership("", lambda user, role_assignment: False)
        value = {}
        user = mock.Mock(roleassignment=None)
        serializer = mock.Mock(
            model=mock.Mock(__name__="NoModel"), context=mock.Mock(get=mock.Mock(return_value=mock.Mock(user=user)))
        )
        with pytest.raises(serializers.ValidationError) as e:
            t(value, serializer)
        assert "relationship of requesting user to request" in str(e)

    def test_no_ownership(self):
        t = ValidateFkReferenceOwnership("id", lambda user, role_assignment: False)
        value = {"id": mock.Mock(user_has_ownership_via_role=mock.Mock(return_value=False))}
        user = mock.Mock(roleassignment="haXor")
        serializer = mock.Mock(model=mock.Mock(context=mock.Mock(get=mock.Mock(return_value=mock.Mock(user=user)))))
        with pytest.raises(serializers.ValidationError) as e:
            t(value, serializer)
        assert "Not found" in str(e)
