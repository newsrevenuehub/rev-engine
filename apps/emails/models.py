import logging

from django.conf import settings
from django.db import models

from anymail.exceptions import AnymailError
from anymail.message import AnymailMessage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class BaseEmailTemplate(models.Model):

    identifier = models.TextField(blank=True)

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


class MailGunEmailTemplate(BaseEmailTemplate):
    schema = models.JSONField(blank=True)

    def send_email(self, to, subject=None, **kwargs):
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
            logger.error(f"MailGunEmail Failed to send {e.message}")
