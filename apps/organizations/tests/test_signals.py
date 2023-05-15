from unittest.mock import MagicMock

from django.db.models import signals

import pytest

from apps.organizations.signals import revenue_program_post_save
from apps.organizations.tests.factories import RevenueProgramFactory


def test_signal_registry():
    registered_functions = [r[1]() for r in signals.post_save.receivers]
    assert revenue_program_post_save in registered_functions


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
