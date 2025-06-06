from django.test import Client
from django.urls import reverse

import pytest

from apps.emails.models import EmailCustomization
from apps.users.models import User


@pytest.mark.django_db
class TestEmailCustomizationAdmin:
    def test_views_stand_up(self, client: Client, email_customization: EmailCustomization, superuser: User) -> None:
        client.force_login(superuser)
        client.get(reverse("admin:emails_emailcustomization_changelist"))
        client.get(reverse("admin:emails_emailcustomization_add"))
        client.get(reverse("admin:emails_emailcustomization_change", args=[email_customization.pk]))
