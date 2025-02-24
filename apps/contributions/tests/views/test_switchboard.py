import pytest
from knox.models import AuthToken
from rest_framework import status
from rest_framework.reverse import reverse

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.models import Contribution, Contributor
from apps.contributions.serializers import SwitchboardContributionRevenueProgramSourceValues
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
)
from apps.contributions.views.switchboard import SEND_RECEIPT_QUERY_PARAM
from apps.organizations.models import PaymentProvider, RevenueProgram
from apps.organizations.tests.factories import (
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestSwitchboardContributorsViews:
    """Tests for switchboard contributors views, for SwitchboardContributorsViewSet and related function-based views."""

    @pytest.mark.parametrize("already_exists", [True, False])
    def test_create(self, api_client, faker, already_exists, switchboard_api_token):
        email = faker.email()
        if already_exists:
            existing = ContributorFactory(email=email)
        response = api_client.post(
            reverse("switchboard-contributor-list"),
            data={"email": email},
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if already_exists:
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {"error": f"A contributor (ID: {existing.id}) with email {email} already exists"}
        else:
            assert response.status_code == status.HTTP_201_CREATED
            contributor = Contributor.objects.get(email=email)
            assert response.json() == {"email": email, "id": contributor.id}

    @pytest.fixture
    def contributor(self):
        return ContributorFactory()

    @pytest.mark.parametrize("exists", [True, False])
    def test_retrieve_by_id(self, api_client, switchboard_api_token, contributor, exists):
        pk = contributor.id
        if not exists:
            contributor.delete()
        response = api_client.get(
            reverse("switchboard-contributor-detail", args=(pk,)),
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if exists:
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {"email": contributor.email, "id": pk}
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("exists", [True, False])
    def test_retrieve_by_email(self, api_client, switchboard_api_token, contributor, exists):
        email = contributor.email
        if not exists:
            contributor.delete()
        response = api_client.get(
            reverse("switchboard-contributor-by-email", args=(email,)),
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if exists:
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {"email": email, "id": contributor.id}
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.fixture
    def retrieve_by_email_config(self, contributor):
        return {
            "method": "get",
            "url": reverse("switchboard-contributor-by-email", args=(contributor.email,)),
            "data": None,
        }

    @pytest.fixture
    def retrieve_by_id_config(self, contributor):
        return {
            "method": "get",
            "url": reverse("switchboard-contributor-detail", args=(contributor.id,)),
            "data": None,
        }

    @pytest.fixture
    def create_config(self, faker):
        return {"method": "post", "url": reverse("switchboard-contributor-list"), "data": {"email": faker.email()}}

    @pytest.mark.parametrize("case_config", ["retrieve_by_id_config", "create_config", "retrieve_by_email_config"])
    @pytest.mark.parametrize(
        ("token_fixture", "expect_success"), [("switchboard_api_token", True), ("switchboard_api_expired_token", False)]
    )
    def test_only_works_with_valid_token(self, case_config, token_fixture, expect_success, api_client, request):
        token = request.getfixturevalue(token_fixture)
        config = request.getfixturevalue(case_config)

        def _make_request(method, url, data):
            kwargs = {"headers": {}}
            if token:
                kwargs["headers"]["Authorization"] = f"Token {token}"
            if data:
                kwargs["data"] = data
            return getattr(api_client, method)(url, **kwargs)

        response = _make_request(config["method"], config["url"], config["data"])

        if expect_success:
            assert response.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        else:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSwitchboardContributionsViewSet:

    @pytest.fixture
    def other_user(self):
        return UserFactory(is_superuser=True)

    @pytest.fixture
    def organization(self):
        return OrganizationFactory()

    @pytest.fixture
    def rp_1(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def rp_2(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def other_orgs_rp(self):
        return RevenueProgramFactory()

    @pytest.fixture
    def contribution_with_donation_page(self, rp_1):
        return ContributionFactory(donation_page__revenue_program=rp_1)

    @pytest.fixture
    def contribution_without_donation_page(self, rp_1):
        return ContributionFactory(donation_page=None, _revenue_program=rp_1)

    @pytest.fixture(params=["contribution_with_donation_page", "contribution_without_donation_page"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture
    def creation_data_recurring_with_page(self):
        return {
            "amount": 1000,
            "interval": ContributionInterval.MONTHLY,
            "contributor": ContributorFactory().id,
            "donation_page": DonationPageFactory().id,
            "provider_subscription_id": "sub_123",
            "payment_provider_used": PaymentProvider.STRIPE_LABEL,
        }

    @pytest.fixture
    def creation_data_recurring_with_rp(self, creation_data_recurring_with_page):
        return {
            **{k: v for k, v in creation_data_recurring_with_page.items() if k != "donation_page"},
            "revenue_program": RevenueProgramFactory().id,
        }

    @pytest.fixture
    def creation_data_one_time_with_page(self, creation_data_recurring_with_page):
        return {
            **{k: v for k, v in creation_data_recurring_with_page.items() if k != "provider_subscription_id"},
            "interval": ContributionInterval.ONE_TIME,
            "provider_payment_id": "pi_123",
        }

    @pytest.fixture
    def creation_data_one_time_with_rp(self, creation_data_recurring_with_rp):
        return {
            **{k: v for k, v in creation_data_recurring_with_rp.items() if k != "donation_page"},
            "revenue_program": RevenueProgramFactory().id,
        }

    @pytest.fixture
    def invalid_creation_data_both_rp_and_page(self, creation_data_one_time_with_page):
        return {
            **creation_data_one_time_with_page,
            "revenue_program": RevenueProgramFactory().id,
        }

    @pytest.fixture
    def invalid_creation_data_neither_rp_nor_page(self, creation_data_one_time_with_page):
        return {
            k: v for k, v in creation_data_one_time_with_page.items() if k not in ("revenue_program", "donation_page")
        }

    @pytest.fixture
    def invalid_creation_data_duplicate_payment_id(self, creation_data_one_time_with_page):
        ContributionFactory(provider_payment_id=creation_data_one_time_with_page["provider_payment_id"])
        return creation_data_one_time_with_page

    @pytest.fixture
    def invalid_creation_data_duplicate_subscription_id(self, creation_data_recurring_with_page):
        ContributionFactory(provider_subscription_id=creation_data_recurring_with_page["provider_subscription_id"])
        return creation_data_recurring_with_page

    @pytest.fixture
    def invalid_creation_data_duplicate_setup_intent_id(self, creation_data_recurring_with_page):
        ContributionFactory(provider_setup_intent_id=(si_id := "si_123"))
        return {**creation_data_recurring_with_page, "provider_setup_intent_id": si_id}

    @pytest.mark.parametrize(
        "data_fixture",
        [
            "creation_data_recurring_with_page",
            "creation_data_recurring_with_rp",
            "creation_data_one_time_with_page",
            "creation_data_one_time_with_rp",
        ],
    )
    def test_create_happy_path(self, api_client, data_fixture, request, switchboard_api_token):
        data = request.getfixturevalue(data_fixture)
        response = api_client.post(
            reverse("switchboard-contribution-list"),
            data=data,
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        retrieved = Contribution.objects.get(id=response.json()["id"])
        for k, v in data.items():
            match k:
                case "donation_page":
                    assert retrieved.donation_page == DonationPage.objects.get(pk=data["donation_page"])
                case "contributor":
                    assert retrieved.contributor == Contributor.objects.get(pk=data["contributor"])
                case "revenue_program":
                    assert retrieved._revenue_program == RevenueProgram.objects.get(pk=data["revenue_program"])
                case _:
                    assert getattr(retrieved, k) == v

    @pytest.mark.parametrize(
        "data_fixture",
        [
            "invalid_creation_data_both_rp_and_page",
            "invalid_creation_data_neither_rp_nor_page",
            "invalid_creation_data_duplicate_payment_id",
            "invalid_creation_data_duplicate_subscription_id",
            "invalid_creation_data_duplicate_setup_intent_id",
        ],
    )
    def test_create_when_constraint_violated(self, api_client, data_fixture, request, switchboard_api_token):
        data = request.getfixturevalue(data_fixture)
        response = api_client.post(
            reverse("switchboard-contribution-list"),
            data=data,
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if data_fixture == "invalid_creation_data_both_rp_and_page":
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {
                "non_field_errors": ["Cannot set both revenue_program and donation_page on a contribution"]
            }
        elif data_fixture == "invalid_creation_data_neither_rp_nor_page":
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {
                "non_field_errors": ["Must set either revenue_program or donation_page on a contribution"]
            }
        else:
            assert response.status_code == status.HTTP_409_CONFLICT
            match data_fixture:
                case "invalid_creation_data_duplicate_payment_id":
                    assert response.json() == {
                        "provider_payment_id": ["contribution with this provider payment id already exists."]
                    }
                case "invalid_creation_data_duplicate_subscription_id":
                    assert response.json() == {
                        "provider_subscription_id": ["contribution with this provider subscription id already exists."]
                    }
                case "invalid_creation_data_duplicate_setup_intent_id":
                    assert response.json() == {
                        "provider_setup_intent_id": ["contribution with this provider setup intent id already exists."]
                    }

    def test_create_when_invalid_metadata(
        self, api_client, switchboard_api_token, creation_data_recurring_with_page, invalid_metadata
    ):
        creation_data_recurring_with_page["contribution_metadata"] = invalid_metadata
        response = api_client.post(
            reverse("switchboard-contribution-list"),
            data=creation_data_recurring_with_page,
            headers={"Authorization": f"Token {switchboard_api_token}"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"contribution_metadata": ["does not conform to a known schema"]}

    @pytest.mark.parametrize(
        ("querystring", "send_receipt"),
        [
            (f"?{SEND_RECEIPT_QUERY_PARAM}=yes", True),
            (f"?{SEND_RECEIPT_QUERY_PARAM}=y", True),
            (f"?{SEND_RECEIPT_QUERY_PARAM}=true", True),
            ("", False),
        ],
    )
    def test_create_receipt_behavior(
        self, api_client, creation_data_recurring_with_page, switchboard_api_token, mocker, querystring, send_receipt
    ):
        mock_handle_thank_you_email = mocker.patch("apps.contributions.models.Contribution.handle_thank_you_email")
        api_client.post(
            reverse("switchboard-contribution-list") + querystring,
            data=creation_data_recurring_with_page,
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        assert mock_handle_thank_you_email.called is send_receipt

    def test_retrieve(self, api_client, contribution, switchboard_api_token):
        response = api_client.get(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "amount": contribution.amount,
            "contribution_metadata": contribution.contribution_metadata,
            "contributor": contribution.contributor.id,
            "currency": contribution.currency,
            "donation_page": contribution.donation_page.id if contribution.donation_page else None,
            "id": contribution.id,
            "interval": contribution.interval,
            "last_payment_date": contribution.last_payment_date.isoformat() if contribution.last_payment_date else None,
            "payment_provider_used": contribution.payment_provider_used,
            "provider_customer_id": contribution.provider_customer_id,
            "provider_payment_id": contribution.provider_payment_id,
            "provider_payment_method_id": contribution.provider_payment_method_id,
            "provider_payment_method_details": contribution.provider_payment_method_details,
            "provider_setup_intent_id": contribution.provider_setup_intent_id,
            "provider_subscription_id": contribution.provider_subscription_id,
            "revenue_program": contribution.revenue_program.id,
            "revenue_program_source": (
                SwitchboardContributionRevenueProgramSourceValues.DIRECT
                if contribution._revenue_program
                else SwitchboardContributionRevenueProgramSourceValues.VIA_PAGE
            ),
            "status": contribution.status,
        }

    @pytest.fixture
    def update_data_recurring_with_page(self, faker, valid_metadata):
        contribution = ContributionFactory(
            monthly_subscription=True,
            provider_subscription_id=faker.uuid4(),
            provider_setup_intent_id=faker.uuid4(),
            status=ContributionStatus.PROCESSING,
        )
        return {
            "amount": contribution.amount + 1000,
            "interval": ContributionInterval.YEARLY,
            "contributor": ContributorFactory().id,
            "contribution_metadata": {**valid_metadata, "reason_for_giving": "some-other-reason"},
            "donation_page": DonationPageFactory().id,
            "provider_subscription_id": faker.uuid4(),
            "currency": "CAD",
            "provider_setup_intent_id": faker.uuid4(),
            "provider_customer_id": faker.uuid4(),
            "provider_payment_id": faker.uuid4(),
            "provider_payment_method_id": faker.uuid4(),
            "provider_payment_method_details": {"key": "value"},
            "status": ContributionStatus.PAID,
        }, contribution

    @pytest.fixture
    def update_data_recurring_with_rp(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        org = contribution.revenue_program.organization
        contribution._revenue_program = contribution.donation_page.revenue_program
        contribution.donation_page = None
        contribution.save()
        data["revenue_program"] = RevenueProgramFactory(organization=org).id
        del data["donation_page"]
        return data, contribution

    @pytest.mark.parametrize(
        "data_fixture",
        [
            "update_data_recurring_with_page",
            "update_data_recurring_with_rp",
        ],
    )
    def test_update_happy_path(self, api_client, contribution, data_fixture, request, switchboard_api_token):
        data, contribution = request.getfixturevalue(data_fixture)
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data=data,
            format="json",
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        for k, v in data.items():
            match k:
                case "donation_page":
                    assert contribution.donation_page == DonationPage.objects.get(pk=data["donation_page"])
                case "contributor":
                    assert contribution.contributor == Contributor.objects.get(pk=data["contributor"])
                case "revenue_program":
                    assert contribution._revenue_program == RevenueProgram.objects.get(pk=data["revenue_program"])
                case _:
                    assert getattr(contribution, k) == v

    @pytest.fixture
    def invalid_update_data_both_rp_and_page(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        data["revenue_program"] = contribution.donation_page.revenue_program.id
        return data, contribution

    @pytest.fixture
    def invalid_update_data_would_yield_no_rp_or_dp(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        data["donation_page"] = None
        return data, contribution

    @pytest.fixture
    def invalid_update_data_duplicate_payment_id(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        ContributionFactory(provider_payment_id=data["provider_payment_id"])
        return data, contribution

    @pytest.fixture
    def invalid_update_data_duplicate_subscription_id(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        ContributionFactory(provider_subscription_id=data["provider_subscription_id"])
        return data, contribution

    @pytest.fixture
    def invalid_update_data_duplicate_setup_intent_id(self, update_data_recurring_with_page):
        data, contribution = update_data_recurring_with_page
        ContributionFactory(provider_setup_intent_id=data["provider_setup_intent_id"])
        return data, contribution

    @pytest.mark.parametrize(
        "data_fixture",
        [
            "invalid_update_data_both_rp_and_page",
            "invalid_update_data_would_yield_no_rp_or_dp",
            "invalid_update_data_duplicate_payment_id",
            "invalid_update_data_duplicate_subscription_id",
            "invalid_update_data_duplicate_setup_intent_id",
        ],
    )
    def test_update_when_constraint_violated(self, api_client, data_fixture, request, switchboard_api_token):
        data, contribution = request.getfixturevalue(data_fixture)
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data=data,
            headers={"Authorization": f"Token {switchboard_api_token}"},
            format="json",
        )
        if data_fixture == "invalid_update_data_both_rp_and_page":
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {
                "non_field_errors": ["Cannot set both revenue_program and donation_page on a contribution"]
            }
        elif data_fixture == "invalid_update_data_would_yield_no_rp_or_dp":
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {
                "non_field_errors": ["Must set either revenue_program or donation_page on a contribution"]
            }
        else:
            assert response.status_code == status.HTTP_409_CONFLICT
            match data_fixture:
                case "invalid_creation_data_duplicate_payment_id":
                    assert response.json() == {
                        "provider_payment_id": ["contribution with this provider payment id already exists."]
                    }
                case "invalid_creation_data_duplicate_subscription_id":
                    assert response.json() == {
                        "provider_subscription_id": ["contribution with this provider subscription id already exists."]
                    }
                case "invalid_creation_data_duplicate_setup_intent_id":
                    assert response.json() == {
                        "provider_setup_intent_id": ["contribution with this provider setup intent id already exists."]
                    }

    def test_update_when_patching_rp_for_different_org(
        self, api_client, contribution, other_orgs_rp, switchboard_api_token
    ):
        assert contribution.revenue_program.organization != other_orgs_rp.organization
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data={"revenue_program": other_orgs_rp.id},
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "revenue_program": ["Cannot assign contribution to a revenue program from a different organization"]
        }

    @pytest.mark.parametrize(
        "unique_field", ["provider_subscription_id", "provider_setup_intent_id", "provider_payment_id"]
    )
    def test_update_when_violate_uniqueness_constraint(self, api_client, switchboard_user, unique_field):
        ContributionFactory(**{unique_field: (unique_val := "unique")})
        contribution = ContributionFactory()
        api_client.force_authenticate(switchboard_user)
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data={unique_field: unique_val},
        )
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json() == {
            unique_field: [f"contribution with this {unique_field.replace('_', ' ')} already exists."]
        }

    def test_update_when_invalid_metadata(self, api_client, switchboard_api_token, contribution, invalid_metadata):
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data={"contribution_metadata": invalid_metadata},
            headers={"Authorization": f"Token {switchboard_api_token}"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"contribution_metadata": ["does not conform to a known schema"]}

    @pytest.mark.parametrize("method", ["patch", "post", "get"])
    def test_requests_when_not_switchboard_user(self, api_client, other_user, contribution, method):
        token = AuthToken.objects.create(other_user)[1]
        url_name = f"switchboard-contribution-{'list' if method == 'post' else 'detail'}"
        url_kwargs = {"args": (contribution.id,)} if method in ("patch", "get") else {}
        url = reverse(url_name, **url_kwargs)
        request_kwargs = {"data": {}} if method != "get" else {}
        response = getattr(api_client, method)(url, **request_kwargs, headers={"Authorization": f"Token {token}"})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.parametrize("method", ["patch", "post", "get"])
    def test_requests_when_token_expired(self, api_client, switchboard_api_expired_token, method):
        url_name = f"switchboard-contribution-{'list' if method == 'post' else 'detail'}"
        url_kwargs = {"args": (1,)} if method in ("patch", "get") else {}
        url = reverse(url_name, **url_kwargs)
        request_kwargs = {"data": {}} if method != "get" else {}
        response = getattr(api_client, method)(
            url, headers={"Authorization": f"Token {switchboard_api_expired_token}", **request_kwargs}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json() == {"detail": "Invalid token."}
