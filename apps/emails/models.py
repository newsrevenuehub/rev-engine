import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from anymail.exceptions import AnymailError
from anymail.message import AnymailMessage

from apps.contributions.payment_managers import StripePaymentManager
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class EmailTemplateError(Exception):
    """
    Base Exception class for EmailTemplate errors
    """

    pass


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

    class Meta:
        abstract = True

    @classmethod
    def create_template(cls, **kwargs):
        pass

    def get_template(self):
        pass

    def delete_template(self):
        pass

    def update_template(self):
        pass

    def send_email(self, to, subject):
        pass

    def __str__(self):
        return self.identifier


class PageEmailTemplate(BaseEmailTemplate):
    """
    Sends a transactional email using template variables using a template stored on the Email Service Provider (ESP)

    TODO: Enable an instance to create the template on the ESP
    TODO: Allow update of template on the ESP.
    TODO: Allow deletion of template on the ESP
    """

    donation_page = models.ForeignKey(DonationPage, null=True, blank=True, on_delete=models.CASCADE)

    @classmethod
    def get_or_create_template(cls, template_type, donation_page: DonationPage):
        """Gets or creates a default instance and links to a donation_page based
        on an existing default template type."""
        if (
            template := PageEmailTemplate.objects.get(donation_page=donation_page)
            .filter(template_type=template_type)
            .first()
        ) :
            return template

        """Create a template type default for this type and page.
        Only Revengine defaults should have NULL donation pages.
        """
        if obj := PageEmailTemplate.objects.get(template_type=template_type).filter(donation_page__isnull=True):
            return cls(
                identifier=f"default-{donation_page.organization.slug}-{template_type}",
                template_type=template_type,
                donation_page=donation_page,
                schema=obj.schema,
            )
        raise EmailTemplateError(f"No default template exists for type: {template_type}")

    def send_email(self, to, subject=None, **kwargs):
        """Sends an email to a contact using a schema of template tags defined for an instance type of the Email
        template.

        If the instance template data does not match the stored schema the email will proceed and a notification email
        will be sent to the admins to let them know about potential template drift.
        """
        template_data = kwargs.get("template_data", {})
        if self.schema.keys() != template_data.keys():
            logger.warning(f"Template schema does not match: {template_data}")
        message = AnymailMessage()
        message.template_id = self.identifier
        message.to = [to]
        message.subject = subject
        message.merge_global_data = template_data

        try:
            message.send()
        except AnymailError as e:
            logger.error(f"{self.template_type} email failed to send {e.message}")

    class Meta:
        unique_together = ["donation_page", "identifier", "template_type"]

    def default_one_time_donation(self, payment_manager: StripePaymentManager):
        merge_data = {
            "donation_date": timezone.now(),
            "donor_email": payment_manager.contribution.contributor.email,
            "intent_amount": f"${(payment_manager.contribution.amount / 100):.2f}",
        }

        self.schema[0].update(merge_data)
        self.send_email(to=payment_manager.contribution.contributor.email, template_data=self.schema[0])

    def clean(self):
        """The admin widget for a JSONField is Textfield.
        A raw dict needs to be wrapped in a list to validate
        """
        if isinstance(self.schema, dict):
            self.schema = [self.schema]
        super().clean()
