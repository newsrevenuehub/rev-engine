from unittest.mock import MagicMock

import pytest

from apps.organizations.models import RevenueProgram
from apps.organizations.signals import (
    delete_rp_mailchimp_access_token_secret,
    revenue_program_post_save,
)
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.mark.django_db
class TestRevenueProgramPostSaveHandler:
    @pytest.mark.parametrize(
        "make_rp_kwargs,expect_task_called",
        (
            ({"mailchimp_list_id": None}, False),
            ({"mailchimp_list_id": "some-id"}, True),
        ),
    )
    def test_when_new_instance(self, make_rp_kwargs, expect_task_called, mocker):
        rp = RevenueProgramFactory.build(**make_rp_kwargs)
        setup_mc_task = mocker.patch("apps.organizations.signals.setup_mailchimp_entities_for_rp_mailing_list")
        revenue_program_post_save(sender=MagicMock(), instance=rp, created=True)
        if expect_task_called:
            setup_mc_task.delay.assert_called_once_with(rp.id)
        else:
            assert not setup_mc_task.delay.called

    @pytest.mark.parametrize(
        "update_rp_kwargs,expect_task_called",
        (
            ({"mailchimp_list_id": None}, False),
            ({"mailchimp_list_id": "some-id"}, True),
        ),
    )
    def test_when_existing_instance(self, update_rp_kwargs, expect_task_called, mocker, revenue_program):
        setup_mc_task = mocker.patch("apps.organizations.signals.setup_mailchimp_entities_for_rp_mailing_list")
        update_fields = set()
        for k, v in update_rp_kwargs.items():
            setattr(revenue_program, k, v)
            update_fields.add(k)
        revenue_program.save(update_fields=update_fields)
        if expect_task_called:
            setup_mc_task.delay.assert_called_once_with(revenue_program.id)
        else:
            assert not setup_mc_task.delay.called


@pytest.mark.django_db
class TestRevenueProgramDeletedhandler:
    def test_when_mailchimp_access_token(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        settings.GOOGLE_CLOUD_PROJECT_ID = "some-id"
        mock_get_client = mocker.patch("apps.common.secrets.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = (token := b"token-val")
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix="us1")
        assert revenue_program.mailchimp_access_token == token.decode("UTF-8")
        delete_rp_mailchimp_access_token_secret(RevenueProgram, revenue_program)
        mock_get_client.return_value.delete_secret.assert_called_once_with(
            request={
                "name": f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}/secrets/{revenue_program.mailchimp_access_token_secret_name}"
            }
        )


@pytest.mark.django_db
class TestOrganizationPostSaveHandler:
    def test_happy_path(self, organization, mocker):
        pass


@pytest.mark.django_db
class TestHandleSetDefaultDonationPage:
    def test_when_no_rp(self):
        pass

    def test_when_already_have_default(self):
        pass

    def test_when_no_page_to_set(self):
        pass

    def test_when_page_to_set(self):
        pass


@pytest.mark.django_db
class TestGetPageToBeSetAsDefault:
    def test_when_no_pages(self):
        pass

    def test_when_one_page(self):
        pass

    def test_when_gt_1_page_and_1_published(self):
        pass

    def test_when_gt_1_page_and_gt_1_published(self):
        pass

    def test_when_gt_1_page_and_none_published(self):
        pass
