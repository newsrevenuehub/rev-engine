from django.test import Client
from django.urls import reverse

import pytest

from apps.emails.models import EmailCustomization
from apps.organizations.models import RevenueProgram
from apps.users.models import User


@pytest.mark.django_db
class TestEmailCustomizationAdmin:

    @pytest.fixture
    def email_customization(self, revenue_program: RevenueProgram) -> EmailCustomization:
        return EmailCustomization(
            revenue_program=revenue_program,
            content_html="<p>Test content</p>",
            email_type="contribution_receipt",
            email_block="message",
        )

    def test_views_stand_up(self, client: Client, email_customization: EmailCustomization, superuser: User) -> None:
        client.force_login(superuser)
        client.get(reverse("admin:emails_emailcustomization_changelist"))
        client.get(reverse("admin:emails_emailcustomization_add"))
        client.get(reverse("admin:emails_emailcustomization_change", args=[email_customization.pk]))
