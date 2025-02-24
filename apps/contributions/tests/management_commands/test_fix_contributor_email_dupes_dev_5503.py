from django.core.management import call_command

import pytest

from apps.contributions.management.commands.fix_contributor_email_dupes_dev_5503 import Command
from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory


@pytest.mark.django_db
class TestCommand:

    @pytest.fixture
    def dupes_with_contributions(self):
        email = "foo@bar.com"
        canonical = ContributorFactory(email=email)
        duplicate = ContributorFactory(email=email.upper())
        ContributionFactory(contributor=canonical)
        ContributionFactory(contributor=duplicate)
        return {"canonical": canonical, "duplicates": [duplicate]}

    @pytest.fixture
    def dupes_without_contributions(self):
        email = "bizz@bang.com"
        return {
            "canonical": ContributorFactory(email=email),
            "duplicates": [ContributorFactory(email=email.upper())],
        }

    @pytest.fixture
    def dupes_with_gt_one_contribution(self):
        email = "baz@qux.com"
        canonical = ContributorFactory(email=email)
        dupe1 = ContributorFactory(email=email.upper())
        dupe2 = ContributorFactory(email=email.replace("com", "COM"))
        ContributionFactory.create_batch(size=2, contributor=canonical)
        ContributionFactory.create_batch(size=2, contributor=dupe1)
        ContributionFactory.create_batch(size=2, contributor=dupe2)
        return {"canonical": canonical, "duplicates": [dupe1, dupe2]}

    @pytest.mark.parametrize(
        "dupes_fixture", ["dupes_with_contributions", "dupes_without_contributions", "dupes_with_gt_one_contribution"]
    )
    def test_get_duplicate_emails_by_contributors(self, dupes_fixture, request):
        dupes = request.getfixturevalue(dupes_fixture)
        result = Command().get_duplicate_emails_by_contributors()
        assert result.count() == 1
        assert (item := result[0])["lower_email"] == dupes["canonical"].email.lower()
        assert item["contributor_count"] == len(dupes["duplicates"]) + 1
        assert set(item["contributors"]) == {dupes["canonical"].id, *(x.id for x in dupes["duplicates"])}

    @pytest.mark.usefixtures("dupes_with_contributions")
    def test_get_canonical_and_duplicate_contributors(self):
        duplicate_data = Command.get_duplicate_emails_by_contributors()
        result = Command.get_canonical_and_duplicate_contributors(duplicate_data[0])
        assert result["canonical"].id == duplicate_data[0]["contributors"][0]
        for dupe in result["duplicates"]:
            assert dupe.created > result["canonical"].created
        assert set(result["duplicates"].values_list("id", flat=True)) == set(duplicate_data[0]["contributors"][1:])

    def test_make_initial_report(
        self, dupes_with_contributions, dupes_without_contributions, dupes_with_gt_one_contribution
    ):
        dupe_mapping = [
            Command.get_canonical_and_duplicate_contributors(x) for x in Command.get_duplicate_emails_by_contributors()
        ]
        report = Command().make_initial_report(dupe_mapping)
        assert set(report.columns) == {
            "to_delete_contributor_id",
            "canonical_contributor_id",
            "canonical_contributor_email",
            "status",
            "contribution_id",
            "contribution_interval",
            "org_slug",
        }
        expected_row_count = (
            len(dupes_without_contributions["duplicates"])
            + Contribution.objects.filter(contributor_id__in=dupes_with_contributions["duplicates"]).count()
            + Contribution.objects.filter(contributor_id__in=dupes_with_gt_one_contribution["duplicates"]).count()
        )
        assert report.shape[0] == expected_row_count

    @pytest.mark.usefixtures("dupes_with_contributions", "dupes_without_contributions")
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_call(self, dry_run):
        call_command(Command().name.split(".py")[0], dry_run=dry_run)
