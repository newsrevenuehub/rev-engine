from factory.django import DjangoModelFactory
from faker import Faker

from apps.emails import models


fake = Faker()


class PageEmailTemplateFactory(DjangoModelFactory):
    class Meta:
        model = models.PageEmailTemplate


def get_contact_types():
    return models.PageEmailTemplate.ContactType.values


def create_default_templates(contact_types=models.PageEmailTemplate.ContactType.values):
    default_id_prefix = "nrh-default"
    for ct in contact_types:
        PageEmailTemplateFactory(template_type=ct, identifier=f"{default_id_prefix}-{ct.lower()}")
