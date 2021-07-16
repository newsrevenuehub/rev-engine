from django.core.management.base import BaseCommand

from faker import Faker

import apps.contributions.tests.factories as contrib_factories
import apps.organizations.tests.factories as org_factories
import apps.users.tests.factories as user_factories


faker = Faker()


def create_n_instances(n, model_factory, **model_factory_kwargs):
    return [model_factory(**model_factory_kwargs) for n in range(n)]


def create_org_users(orgs, n=1, password="tHiSiStHePaSwOrD"):
    org_users = []
    for org in orgs:
        users = create_n_instances(n, user_factories.OrganizationUserFactory, user_password=password, organization=org)
        org_users.extend(users)
    return org_users


def create_orgs(n=3):
    return create_n_instances(n, org_factories.OrganizationFactory)


def create_contributors(n=3):
    return create_n_instances(n, contrib_factories.ContributorFactory)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--n-orgs",
            type=int,
            default=3,
            help=("How many orgs to create",),
        )
        parser.add_argument(
            "--n-org-users",
            type=int,
            default=1,
            help=("How many org users to create per org",),
        )
        parser.add_argument(
            "--n-contributors",
            type=int,
            default=3,
            help=("How contributors to create",),
        )
        parser.add_argument(
            "--n-contributions",
            type=int,
            default=3,
            help=("How many contributions to create per contributor per org",),
        )

    def handle(self, *args, **options):
        n_orgs = options["n_orgs"]
        n_org_users = options["n_org_users"]
        n_contributors = options["n_contributors"]
        n_contributions = options["n_contributions"]

        orgs = create_orgs(n=n_orgs)
        msg = f"Created (or retrieved) {len(orgs)} organizations"
        for org in orgs:
            msg += f"/n/t -{org.name} | ID: {org.pk}"
        self.stdout.write(msg)

        org_users = create_org_users(orgs, n=n_org_users)
        msg = f"Created (or retrieved) {len(org_users)} organization users"
        for org_user in org_users:
            msg += f"/n/t -{org_user.user.email} | ID: {org_user.pk} | Org: {org_user.organization.name}"
        self.stdout.write(msg)

        contributors = create_contributors(n=n_contributors)
        self.stdout.write(f"Created (or retrieved) {len(contributors)} contributors")

        contributions = []
        for contributor in contributors:
            for org in orgs:
                for n in range(n_contributions):
                    contributions.append(
                        contrib_factories.ContributionFactory(organization=org, contributor=contributor)
                    )
        msg = f"Created {len(contributions)} contributions"
        self.stdout.write(msg)
