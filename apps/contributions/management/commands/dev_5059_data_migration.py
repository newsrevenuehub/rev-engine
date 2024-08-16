from django.core.management.base import BaseCommand

from apps.contributions.models import Contribution


class Command(BaseCommand):
    def handle(self, *args, **options):
        # cribbed from
        # https://stackoverflow.com/questions/29787853/django-migrations-add-field-with-default-as-function-of-model
        # and optimized for memory usage with chatgpt
        batch_size = 1000
        contributions_count = Contribution.objects.count()

        self.stdout.write(self.style.HTTP_INFO(f"Migrating {contributions_count} contributions total"))

        for start in range(0, contributions_count, batch_size):
            self.stdout.write(self.style.HTTP_INFO(f"Migrating {start}-{start+batch_size}"))
            contributions = list(Contribution.objects.all()[start : start + batch_size])

            for contribution in contributions:
                contribution.first_payment_date = contribution.created

            Contribution.objects.bulk_update(contributions, ["first_payment_date"], batch_size=batch_size)
            del contributions  # Explicitly delete the processed contributions to free memory

        self.stdout.write(self.style.HTTP_SUCCESS("Done"))
