import pytest

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.filters import PortalContributionFilter
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestPortalContributionFilter:
    @pytest.fixture
    def filter(self):
        return PortalContributionFilter()

    def test_allowed_filter_fields(self, filter):
        assert filter.ALLOWED_FILTER_FIELDS == [
            "status",
            "revenue_program",
        ]

    @pytest.fixture()
    def contributions(self, valid_metadata_factory):
        con1 = ContributionFactory(status=ContributionStatus.PAID)
        metadata = valid_metadata_factory.get(revenue_program_id=str(con1.donation_page.revenue_program.id))
        # because we match filtering for revenue_program on contribution_metadata in addition to dontation_page__revenue_program
        con2 = ContributionFactory(donation_page=None, contribution_metadata=metadata, status=ContributionStatus.PAID)
        con3 = ContributionFactory(donation_page=con1.donation_page, status=ContributionStatus.REFUNDED)
        con4 = ContributionFactory(donation_page__revenue_program=RevenueProgramFactory())
        return [con1, con2, con3, con4]

    @pytest.fixture()
    def contributions_interval(self):
        con1 = ContributionFactory(
            donation_page=None, status=ContributionStatus.PAID, interval=ContributionInterval.MONTHLY
        )
        con2 = ContributionFactory(
            donation_page=None, status=ContributionStatus.PAID, interval=ContributionInterval.YEARLY
        )
        con3 = ContributionFactory(
            donation_page=None, status=ContributionStatus.PAID, interval=ContributionInterval.ONE_TIME
        )
        return [con1, con2, con3]

    @pytest.mark.parametrize(
        "interval_option, expected_count",
        [
            (None, 3),
            ("one_time", 1),
            ("recurring", 2),
        ],
    )
    def test_interval_filter_queryset(self, interval_option, expected_count, contributions_interval, filter, mocker):
        monthly, yearly, one_time = contributions_interval
        request = mocker.Mock(query_params={"interval": interval_option})
        unfiltered = Contribution.objects.all()
        assert unfiltered.count() == 3
        filtered = filter.filter_queryset(request, unfiltered)
        assert filtered.count() == expected_count
        match request.query_params.get("interval"):
            case ContributionInterval.ONE_TIME.value:
                assert one_time in filtered
                assert yearly not in filtered
                assert monthly not in filtered
            case PortalContributionFilter.RECURRING:
                assert yearly in filtered
                assert monthly in filtered
                assert one_time not in filtered
            case _:
                assert one_time in filtered
                assert yearly in filtered
                assert monthly in filtered

    def test_filter_queryset(self, contributions, filter, mocker):
        paid, by_metadata, _, _ = contributions
        request = mocker.Mock(
            query_params={"status": "paid", "revenue_program": str(paid.donation_page.revenue_program.id)}
        )
        unfiltered = Contribution.objects.all()
        assert unfiltered.count() == 4
        filtered = filter.filter_queryset(request, unfiltered)
        assert filtered.count() == 2
        assert set(list(filtered.values_list("id", flat=True))) == {paid.id, by_metadata.id}
