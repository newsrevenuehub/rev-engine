from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from faker import Faker

import apps.contributions.tests.factories as contrib_factories
import apps.organizations.tests.factories as org_factories

faker = Faker()


def _what_happened(
    instances,
    display_name,
    instance_attr="pk",
    child_additions_zip_key=None,
    child_display_name=None,
    child_instance_attr=None,
):
    if not child_additions_zip_key:
        return [f"{len(instances)} of {display_name} are available"] + [
            f"*   {getattr(instance, instance_attr)}" for instance in instances
        ]
    if child_additions_zip_key:
        happenings = []
        for instance in instances:
            for child_added in getattr(instance, child_additions_zip_key):
                happenings.append(
                    f"Added a {child_display_name} to {display_name} whose attribute "
                    f"`{child_instance_attr}` value is {getattr(child_added, child_instance_attr)}"
                )
        return happenings


def create_n_instances(n, model_factory, **model_factory_kwargs):
    return [model_factory(**model_factory_kwargs) for n in range(n)]


def create_n_users_for_org(org, n=1, password="tHiSiStHePaSwOrD"):
    """Create n number of users. This uses get_or_creat"""
    for _ in range(n):
        org.users.add(create_n_instances(n, get_user_model(), password=password))
    org.save()
    return org.refresh_from_db()


def create_orgs(n=3):
    return create_n_instances(n, org_factories.OrganizationFactory)

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "n-base",
            type=int,
            default=3,
            help=("How many of each entity to make, within its particular place in model graph",),
        )

    def handle(self, *args, **options):
        n_base = options["n_base"]

        org_users = create_n_users_for_org(n=n_base)
        self.stdout.write(_what_happened(org_users, "Organization users", "email"))

        orgs = create_orgs(n=n_base)
        self.stdout.write(_what_happened(orgs, "Organizations", "name"))

        for index, item in orgs:
            user in org_users:

            orgs,
            org_user_transforms=None,
        )
        pass
