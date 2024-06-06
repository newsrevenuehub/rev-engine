import pytest

from apps.contributions.choices import ContributionInterval, ContributionStatus
from apps.contributions.filters import PortalContributionFilter
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db()
class TestPortalContributionFilter:
    @pytest.fixture()
    def filter_(self):
        return PortalContributionFilter()

    def test_allowed_filter_fields(self, filter_):
        assert [
            "status",
            "revenue_program",
        ] == filter_.ALLOWED_FILTER_FIELDS

    @pytest.fixture()
    def contributions(self, valid_metadata_factory):
        con1 = ContributionFactory(status=ContributionStatus.PAID)
        con2 = ContributionFactory(
            donation_page=None,
            status=ContributionStatus.PAID,
            _revenue_program=con1.revenue_program,
        )
        con3 = ContributionFactory(donation_page=con1.donation_page, status=ContributionStatus.REFUNDED)
        con4 = ContributionFactory(donation_page__revenue_program=RevenueProgramFactory())
        return [con1, con2, con3, con4]

    @pytest.fixture()
    def contributions_interval(self):
        rp = RevenueProgramFactory()
        con1 = ContributionFactory(
            donation_page=None,
            status=ContributionStatus.PAID,
            interval=ContributionInterval.MONTHLY,
            _revenue_program=rp,
        )
        con2 = ContributionFactory(
            donation_page=None,
            status=ContributionStatus.PAID,
            interval=ContributionInterval.YEARLY,
            _revenue_program=rp,
        )
        con3 = ContributionFactory(
            donation_page=None,
            status=ContributionStatus.PAID,
            interval=ContributionInterval.ONE_TIME,
            _revenue_program=rp,
        )
        return [con1, con2, con3]

    @pytest.mark.parametrize(
        ("interval_option", "expected_count"),
        [
            (None, 3),
            ("one_time", 1),
            ("recurring", 2),
        ],
    )
    def test_interval_filter_queryset(self, interval_option, expected_count, contributions_interval, filter_, mocker):
        monthly, yearly, one_time = contributions_interval
        request = mocker.Mock(query_params={"interval": interval_option})
        unfiltered = Contribution.objects.all()
        assert unfiltered.count() == 3
        filtered = filter_.filter_queryset(request, unfiltered)
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

    def test_filter_queryset(self, contributions, filter_, mocker):
        paid, by_metadata, _, _ = contributions
        request = mocker.Mock(query_params={"status": "paid", "revenue_program": str(paid.revenue_program.id)})
        unfiltered = Contribution.objects.all()
        assert unfiltered.count() == 4
        filtered = filter_.filter_queryset(request, unfiltered)
        assert filtered.count() == 2
        assert set(filtered.values_list("id", flat=True)) == {paid.id, by_metadata.id}
