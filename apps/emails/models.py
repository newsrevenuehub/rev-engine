import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from anymail.message import AnymailMessage

from apps.emails.tasks import send_donation_email


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTemplateError(Exception):
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

    identifier = models.CharField(
        max_length=256, blank=True, help_text="This should match the template name on the ESP"
    )
    template_type = models.CharField(max_length=3, choices=ContactType.choices, default=ContactType.ONE_TIME_DONATION)

    schema = models.JSONField(blank=True, null=True, default=dict)

    objects = models.Manager()
    defaults = DefaultTemplateManager()

    class Meta:
        abstract = True

    @property
    def update_default_fields(self):
        self.schema[0].update({"copyright_year": timezone.now().strftime("%Y")})

    @staticmethod
    def get_template(template_type, donation_page):
        pass

    def delete_template(self):
        pass

    def update_template(self):
        pass

    def send_email(self, to, subject, **kwargs):
        """Sends an email to a contact using a schema of template tags defined for an instance type of the Email
        template.

        If the instance template data does not match the stored schema the email will proceed and a notification email
        will be sent to the admins to let them know about potential template drift.
        """
        template_data = kwargs.get("template_data", {})
        if self.schema[0].keys() != template_data.keys():
            logger.warning(f"Template schema does not match: {template_data}")
        message = AnymailMessage()
        message.template_id = self.identifier
        message.to = [to]
        message.subject = subject
        message.merge_global_data = template_data
        send_donation_email.delay(message)

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

    @staticmethod
    def get_template(template_type, donation_page):
        """A method that will return a PageEmailTemplate based on the type. If the error is raised, something
        has gone horribly wrong. The defaults are added when a DonationPage is created."""
        if obj := donation_page.email_templates.filter(template_type=template_type).first():
            return obj
        raise EmailTemplateError(
            f"No template exists for the page {donation_page.name} and type: {BaseEmailTemplate.ContactType[template_type]}"
        )

    def one_time_donation(self, payment_manager):
        self.schema[0].update({"org_name": payment_manager.get_organization().name})
        merge_data = {
            "donation_date": timezone.now().strftime("%m-%d-%y"),
            "donor_email": payment_manager.data["email"],
            "donation_amount": f"${(payment_manager.data['amount'] / 100):.2f}",
        }

        self.schema[0].update(merge_data)
        self.update_default_fields
        self.send_email(
            to=payment_manager.data["email"], subject="Thank you for your donation!", template_data=self.schema[0]
        )

    def recurring_donation(self, payment_manager):
        pass

    def clean(self):
        """The admin widget for a JSONField is Textfield.
        A raw dict needs to be wrapped in a list to validate
        """
        if isinstance(self.schema, dict):
            self.schema = [self.schema]
        super().clean()
