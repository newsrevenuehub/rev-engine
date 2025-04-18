import pytest
from rest_framework import serializers

from apps.common.validators import ValidateFkReferenceOwnership
from apps.contributions.models import Contribution
from apps.organizations.models import RevenueProgram
from apps.pages.tests.factories import DonationPageFactory


class TestValidateFkReferenceOwnership:
    model = RevenueProgram

    def test_good_has_default_access_fn(self):
        ValidateFkReferenceOwnership("", self.model, lambda user, role_assignment: False)

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
        with pytest.raises(serializers.ValidationError, match="unexpected signature"):
            ValidateFkReferenceOwnership("", self.model, fn)

    def test_model_not_implement_filtered_by_role_assignment(self, monkeypatch):
        monkeypatch.setattr(Contribution.objects, "filtered_by_role_assignment", None)
        with pytest.raises(serializers.ValidationError):
            ValidateFkReferenceOwnership("", Contribution)

    def test_no_user(self, mocker):
        t = ValidateFkReferenceOwnership("", self.model)
        value = {}
        serializer = mocker.Mock(
            model=mocker.Mock(__name__="NoModel"),
            context=mocker.Mock(get=mocker.Mock(return_value=mocker.Mock(user=None))),
        )
        with pytest.raises(serializers.ValidationError, match="relationship of requesting user to request"):
            t(value, serializer)

    def test_no_roleassignment(self, mocker):
        t = ValidateFkReferenceOwnership("", self.model, lambda user, role_assignment: False)
        value = {}
        user = mocker.Mock(roleassignment=None)
        serializer = mocker.Mock(
            model=mocker.Mock(__name__="NoModel"),
            context=mocker.Mock(get=mocker.Mock(return_value=mocker.Mock(user=user))),
        )
        with pytest.raises(serializers.ValidationError, match="relationship of requesting user to request"):
            t(value, serializer)

    @pytest.mark.django_db
    def test_no_ownership(self, org_user_free_plan, mocker):
        dp = DonationPageFactory()
        value = {"id": dp}
        t = ValidateFkReferenceOwnership("id", self.model)
        serializer = mocker.Mock(
            model=mocker.Mock(__name__="NoModel"),
            context=mocker.Mock(get=mocker.Mock(return_value=mocker.Mock(user=org_user_free_plan))),
        )
        with pytest.raises(serializers.ValidationError, match="Not found"):
            t(value, serializer)

    @pytest.mark.django_db
    def test_has_ownership(self, org_user_free_plan, live_donation_page, mocker):
        live_donation_page.revenue_program.organization = org_user_free_plan.roleassignment.organization
        live_donation_page.revenue_program.save()
        value = {"id": live_donation_page}
        t = ValidateFkReferenceOwnership("id", self.model)
        serializer = mocker.Mock(
            model=mocker.Mock(__name__="NoModel"),
            context=mocker.Mock(get=mocker.Mock(return_value=mocker.Mock(user=org_user_free_plan))),
        )
        t(value, serializer)
