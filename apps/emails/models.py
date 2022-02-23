import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from simple_history.models import HistoricalRecords

from apps.emails.tasks import send_donor_email


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTemplateError(Exception):  # noqa
    """
    Base Exception class for EmailTemplate errors
    """

    pass


class DefaultTemplateManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(identifier__startswith="nrh-default")


class BaseEmailTemplate(models.Model):
    class ContactType(models.TextChoices):
        ONE_TIME_DONATION = "OTD", "One Time Donation"
        RECURRING_DONATION = "RCD", "Recurring Donation"
        FAILED_PAYMENT = "FLD", "Failed Payment"
        CANCELLED_DONATION = "CAN", "Cancelled Donation"

        @staticmethod
        def default_schema():
            return {
                "donation_date": "test_donation_date",
                "donor_email": "test_donor_email",
                "donation_amount": "test_donation_amount",
                "copyright_year": "test_copyright_year",
                "org_name": "test_org_name",
            }

    identifier = models.CharField(
        max_length=256, blank=True, help_text="This should match the template name on the ESP"
    )
    template_type = models.CharField(max_length=3, choices=ContactType.choices, default=ContactType.ONE_TIME_DONATION)

    schema = models.JSONField(blank=True, null=True, default=ContactType.default_schema)

    objects = models.Manager()
    defaults = DefaultTemplateManager()

    class Meta:
        abstract = True

    def update_default_fields(self, update_dict) -> None:
        self.schema.update(update_dict)

    def send_email(self, to, subject):
        """Sends an email to a donor using a schema of template tags defined for an instance type of the Email
        template. This is an open schema the only contract that is enforced is that the schema defined in ContactTypes
        will be present.

        Calling methods should update schema before calling this method
        """
        send_donor_email.delay(
            identifier=self.identifier, to=to, subject=subject, template_data=self.schema
        )  # pragma: no cover

    def save(self, *args, **kwargs):
        """
        The override makes sure that the default schema is always present.
        """
        self.schema = self.ContactType.default_schema() | self.schema
        super().save(*args, **kwargs)

    def __str__(self):
        return self.identifier


class PageEmailTemplate(BaseEmailTemplate):
    """
    Sends a transactional email including template variables matching a template stored on the Email Service Provider (ESP)

    TODO: Allow Org Admins to use custom templates
    TODO: Enable an instance to create the template on the ESP
    TODO: Allow update of template on the ESP.
    TODO: Allow deletion of template on the ESP
    """

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    @staticmethod
    def get_template(template_type, donation_page):
        """A method that will return a PageEmailTemplate based on the type. If the error is raised, something
        has gone horribly wrong. The defaults are added when a DonationPage is created."""

        # There should be at least a default page with the requested template type.
        if obj := donation_page.email_templates.filter(template_type=template_type).first():
            return obj

        raise EmailTemplateError(f"No template exists for the page {donation_page.name} and type: {template_type}")

    def one_time_donation(self, payment_manager):
        merge_data = {
            "org_name": payment_manager.get_organization().name,
            "donation_date": timezone.now().strftime("%m-%d-%y"),
            "donor_email": payment_manager.data["email"],
            "donation_amount": f"${(payment_manager.data['amount'] / 100):.2f}",
            "copyright_year": timezone.now().strftime("%Y"),
        }
        self.update_default_fields(merge_data)
        self.send_email(to=payment_manager.data["email"], subject="Thank you for your donation!")
