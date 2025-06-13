from django.test import Client
from django.urls import reverse

import pytest

from apps.contributions.models import Contribution
from apps.emails.models import EmailCustomization, TransactionalEmailNames, TransactionalEmailRecord
from apps.users.models import User


@pytest.mark.django_db
class TestEmailCustomizationAdmin:
    def test_views_stand_up(self, client: Client, email_customization: EmailCustomization, superuser: User) -> None:
        client.force_login(superuser)
        client.get(reverse("admin:emails_emailcustomization_changelist"))
        client.get(reverse("admin:emails_emailcustomization_add"))
        client.get(reverse("admin:emails_emailcustomization_change", args=[email_customization.pk]))


@pytest.mark.django_db
class TestTransactionalEmailRecordAdmin:

    @pytest.fixture
    def transactional_email_record(self, one_time_contribution: Contribution) -> TransactionalEmailRecord:
        record = TransactionalEmailRecord(
            name=TransactionalEmailNames.RECEIPT_EMAIL.value,
            contribution_id=one_time_contribution.pk,
        )
        record.save()
        return record

    def test_views_stand_up(
        self, client: Client, transactional_email_record: TransactionalEmailRecord, superuser: User
    ) -> None:
        client.force_login(superuser)
        assert client.get(reverse("admin:emails_transactionalemailrecord_changelist")).status_code == 200
        assert (
            client.get(
                reverse("admin:emails_transactionalemailrecord_change", args=[transactional_email_record.pk])
            ).status_code
            == 200
        )
