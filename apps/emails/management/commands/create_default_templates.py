from django.core.management.base import BaseCommand

from apps.emails.models import PageEmailTemplate
from apps.pages.models import DonationPage


class Command(BaseCommand):  # pragma: no cover
    def handle(self, *args, **options):

        for ct in PageEmailTemplate.ContactType.values:
            PageEmailTemplate.objects.get_or_create(
                identifier=f"nrh-default-{ct.lower()}",
                schema=PageEmailTemplate.ContactType.default_schema(),
                template_type=ct,
            )

        for dp in DonationPage.objects.all():
            for pet in PageEmailTemplate.objects.all():
                dp.email_templates.add(pet)
