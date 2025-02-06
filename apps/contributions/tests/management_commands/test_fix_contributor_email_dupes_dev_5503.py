from django.core.management import call_command

import pytest

from apps.contributions.management.commands.fix_contributor_email_dupes_dev_5503 import Command
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory


@pytest.mark.django_db
class TestCommand:

    @pytest.fixture
    def dupes_with_contributions(self, faker):
        canonical = ContributorFactory(email=faker.email().lower())
        duplicate = ContributorFactory(email=canonical.email.upper())
        ContributionFactory(contributor=canonical)
        ContributionFactory(contributor=duplicate)
        return {"canonical": canonical, "duplicates": [duplicate]}

    @pytest.fixture
    def dupes_without_contributions(self, faker):
        return {
            "canonical": ContributorFactory(email=(email := faker.email().lower())),
            "duplicates": [ContributorFactory(email=email.upper())],
        }

    @pytest.mark.parametrize("dupes_fixture", ["dupes_with_contributions", "dupes_without_contributions"])
    def test_get_duplicate_emails_by_contributors(self, dupes_fixture, request):
        dupes = request.getfixturevalue(dupes_fixture)
        result = Command().get_duplicate_emails_by_contributors()
        assert result.count() == 1
        assert (item := result[0])["lower_email"] == dupes["canonical"].email
        assert item["contributor_count"] == 2
        assert set(item["contributors"]) == {dupes["canonical"].id, dupes["duplicates"][0].id}

    @pytest.mark.usefixtures("dupes_with_contributions")
    def test_get_canonical_and_duplicate_contributors(self):
        duplicate_data = Command.get_duplicate_emails_by_contributors()
        result = Command.get_canonical_and_duplicate_contributors(duplicate_data[0])
        assert result["canonical"].id == duplicate_data[0]["contributors"][0]
        assert set(result["duplicates"].values_list("id", flat=True)) == set(duplicate_data[0]["contributors"][1:])

    @pytest.mark.usefixtures("dupes_with_contributions", "dupes_without_contributions")
    def test_make_initial_report(self):
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
        assert report.shape[0] == 2

    @pytest.mark.usefixtures("dupes_with_contributions", "dupes_without_contributions")
    @pytest.mark.parametrize("dry_run", [True, False])
    def test_call(self, dry_run):
        call_command(Command().name.split(".py")[0], dry_run=dry_run)
