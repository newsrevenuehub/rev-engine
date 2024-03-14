import pytest

from apps.contributions.choices import ContributionStatus
from apps.contributions.filters import PortalContributionFilter
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestPortalContributionFilter:
    @pytest.fixture
    def filter(self):
        return PortalContributionFilter()

    def test_hidden_statuses(self, filter):
        assert filter.HIDDEN_STATUSES == [
            "flagged",
            "processing",
            "rejected",
        ]

    def test_allowed_filter_fields(self, filter):
        assert filter.ALLOWED_FILTER_FIELDS == [
            "status",
            "revenue_program",
        ]

    @pytest.fixture()
    def contributions(self, valid_metadata_factory):
        con1 = ContributionFactory(status=ContributionStatus.FLAGGED)
        con2 = ContributionFactory(donation_page=con1.donation_page, status=ContributionStatus.PAID)
        metadata = valid_metadata_factory.get(revenue_program_id=str(con1.donation_page.revenue_program.id))
        con3 = ContributionFactory(donation_page=None, status=ContributionStatus.PAID, contribution_metadata=metadata)
        con4 = ContributionFactory(donation_page=con1.donation_page, status=ContributionStatus.REFUNDED)
        con5 = ContributionFactory(
            status=ContributionStatus.PAID, donation_page__revenue_program=RevenueProgramFactory()
        )
        return [con1, con2, con3, con4, con5]

    def test_filter_queryset(self, contributions, filter, mocker):
        _, paid, by_metadata, _, _ = contributions
        request = mocker.Mock(
            query_params={"status": "paid", "revenue_program": str(paid.donation_page.revenue_program.id)}
        )
        unfiltered = Contribution.objects.all()
        assert unfiltered.count() == 5
        filtered = filter.filter_queryset(request, unfiltered)
        assert filtered.count() == 2
        assert set(list(filtered.values_list("id", flat=True))) == {paid.id, by_metadata.id}
