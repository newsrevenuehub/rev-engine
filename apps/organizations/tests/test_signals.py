import pytest

from apps.common.models import SocialMeta
from apps.organizations.models import FreePlan, Organization, RevenueProgram
from apps.organizations.signals import (
    create_default_social_meta,
    get_page_to_be_set_as_default,
    handle_delete_rp_mailchimp_access_token_secret,
    handle_rp_activecampaign_setup,
    handle_rp_mailchimp_entity_setup,
    handle_set_default_donation_page_on_select_core_plan,
    logger,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db
class TestRevenueProgramPostSaveHandler:
    def test_create_social_meta(self):
        before_count = SocialMeta.objects.count()
        rp = RevenueProgramFactory()

        assert SocialMeta.objects.count() == before_count + 1
        assert rp.socialmeta

    def test_does_not_create_social_meta_if_already_exists(self, mocker):
        rp = RevenueProgramFactory()

        before_count = SocialMeta.objects.count()
        assert rp.socialmeta

        create_default_social_meta(sender=mocker.MagicMock(), instance=rp, created=True)

        assert SocialMeta.objects.count() == before_count
        assert rp.socialmeta

    @pytest.mark.parametrize(
        ("make_rp_kwargs", "expect_task_called"),
        [
            ({"mailchimp_list_id": None}, False),
            ({"mailchimp_list_id": "some-id"}, True),
        ],
    )
    def test_when_new_instance(self, make_rp_kwargs, expect_task_called, mocker):
        rp = RevenueProgramFactory.build(**make_rp_kwargs)
        on_commit_mock = mocker.patch("django.db.transaction.on_commit")
        delay_mock = mocker.patch("apps.organizations.signals.setup_mailchimp_entities_for_rp_mailing_list.delay")
        handle_rp_mailchimp_entity_setup(sender=mocker.MagicMock(), instance=rp, created=True)
        if expect_task_called:
            # we have to take this round-about way because in normal test execution, transaction.on_commit won't
            # call its lambda, and we want to assert that the task is called. So we mock the lambda, call it ourselves,
            # and prove that the task function is called with expected args.
            on_commit_mock.assert_called_once()
            lambda_func = on_commit_mock.call_args[0][0]
            lambda_func()
            delay_mock.assert_called_once_with(rp.id)
        else:
            on_commit_mock.assert_not_called()
            delay_mock.assert_not_called()

    @pytest.mark.parametrize(
        ("update_rp_kwargs", "expect_task_called"),
        [
            ({"mailchimp_list_id": None}, False),
            ({"mailchimp_list_id": "some-id"}, True),
        ],
    )
    def test_when_existing_instance(self, update_rp_kwargs, expect_task_called, mocker, revenue_program):
        on_commit_mock = mocker.patch("django.db.transaction.on_commit")
        delay_mock = mocker.patch("apps.organizations.signals.setup_mailchimp_entities_for_rp_mailing_list.delay")
        update_fields = set()
        for k, v in update_rp_kwargs.items():
            setattr(revenue_program, k, v)
            update_fields.add(k)
        revenue_program.save(update_fields=update_fields)
        if expect_task_called:
            # we have to test this in a round-about way because in normal test execution, transaction.on_commit won't
            # call its lambda, and we want to assert that the task is called. So we mock the lambda, call it ourselves,
            # and prove that the task function is called with expected args.
            on_commit_mock.assert_called_once()
            lambda_func = on_commit_mock.call_args[0][0]
            lambda_func()
            delay_mock.assert_called_once_with(revenue_program.id)
        else:
            on_commit_mock.assert_not_called()
            delay_mock.assert_not_called()


@pytest.mark.django_db
class TestRevenueProgramDeletedhandler:
    def test_when_mailchimp_access_token(self, settings, mocker):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        settings.GOOGLE_CLOUD_PROJECT_ID = "some-id"
        mock_get_client = mocker.patch("apps.common.secret_manager.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.return_value.payload.data = (token := b"token-val")
        revenue_program = RevenueProgramFactory(mailchimp_server_prefix="us1")
        assert revenue_program.mailchimp_access_token == token.decode("UTF-8")
        handle_delete_rp_mailchimp_access_token_secret(RevenueProgram, revenue_program)
        mock_get_client.return_value.delete_secret.assert_called_once_with(
            request={
                "name": f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}/secrets/{revenue_program.mailchimp_access_token_secret_name}"
            }
        )


@pytest.fixture
def rp_with_org_on_core():
    return RevenueProgramFactory(organization=OrganizationFactory(core_plan=True))


@pytest.fixture
def rp_with_org_on_free():
    return RevenueProgramFactory(organization=OrganizationFactory(core_plan=True))


@pytest.mark.django_db
class TestHandleSetDefaultDonationPage:
    def test_when_not_on_core_plan(self, rp_with_org_on_free, mocker):
        rp_with_org_on_free.organization.plan_name = FreePlan.name
        rp_with_org_on_free.organization.save()
        logger_spy = mocker.spy(logger, "debug")
        handle_set_default_donation_page_on_select_core_plan(
            sender=Organization, instance=rp_with_org_on_free.organization, created=False
        )
        assert logger_spy.call_args == mocker.call(
            "Org %s is not on CorePlan, skipping", rp_with_org_on_free.organization.id
        )

    def test_when_no_rp(self, mocker):
        org = OrganizationFactory(core_plan=True)
        assert org.revenueprogram_set.count() == 0
        logger_spy = mocker.spy(logger, "debug")
        handle_set_default_donation_page_on_select_core_plan(sender=Organization, instance=org, created=False)
        assert logger_spy.call_args == mocker.call("No RP found for organization %s, skipping", org.id)

    def test_when_already_have_default(self, rp_with_org_on_core, mocker):
        rp_with_org_on_core.default_donation_page = DonationPageFactory(revenue_program=rp_with_org_on_core)
        rp_with_org_on_core.save()
        logger_spy = mocker.spy(logger, "debug")
        handle_set_default_donation_page_on_select_core_plan(
            sender=Organization, instance=rp_with_org_on_core.organization, created=False, update_fields={"plan_name"}
        )
        assert logger_spy.call_args == mocker.call(
            "RP %s already has a default donation page %s",
            rp_with_org_on_core.id,
            rp_with_org_on_core.default_donation_page.id,
        )

    def test_when_no_default_and_no_page_to_set(self, rp_with_org_on_core, mocker):
        logger_spy = mocker.spy(logger, "warning")
        assert rp_with_org_on_core.default_donation_page is None
        mocker.patch("apps.organizations.signals.get_page_to_be_set_as_default", return_value=None)
        handle_set_default_donation_page_on_select_core_plan(
            sender=Organization, instance=rp_with_org_on_core.organization, created=False, update_fields={"plan_name"}
        )
        logger_spy.assert_called_once_with(
            "No donation pages found for RP %s, can't set default donation page", rp_with_org_on_core.id
        )

    def test_when_page_to_set(self, mocker, rp_with_org_on_core):
        save_spy = mocker.spy(RevenueProgram, "save")
        page = DonationPageFactory(revenue_program=rp_with_org_on_core)
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        mocker.patch("apps.organizations.signals.get_page_to_be_set_as_default", return_value=page)
        handle_set_default_donation_page_on_select_core_plan(
            sender=Organization, instance=rp_with_org_on_core.organization, created=False, update_fields={"plan_name"}
        )
        save_spy.assert_called_once_with(rp_with_org_on_core, update_fields={"default_donation_page", "modified"})
        rp_with_org_on_core.refresh_from_db()
        assert rp_with_org_on_core.default_donation_page == page
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with(
            "handle_set_default_donation_page_on_select_core_plan set default_donation_page"
        )


@pytest.mark.django_db
class TestGetPageToBeSetAsDefault:
    def test_when_no_pages(self, revenue_program):
        assert revenue_program.donationpage_set.count() == 0
        assert get_page_to_be_set_as_default(revenue_program) is None

    def test_when_one_page(self, revenue_program):
        page = DonationPageFactory(revenue_program=revenue_program)
        assert get_page_to_be_set_as_default(revenue_program) == page

    def test_when_gt_1_page_and_1_published(self, revenue_program):
        DonationPageFactory(revenue_program=revenue_program, published=False)
        published = DonationPageFactory(revenue_program=revenue_program, published=True)
        revenue_program.refresh_from_db()
        assert revenue_program.donationpage_set.count() == 2
        assert get_page_to_be_set_as_default(revenue_program) == published

    def test_when_gt_1_page_and_gt_1_published(self, revenue_program):
        created_first = DonationPageFactory(published=True, revenue_program=revenue_program)
        # created second
        DonationPageFactory(published=True, revenue_program=revenue_program)
        assert get_page_to_be_set_as_default(revenue_program) == created_first

    def test_when_gt_1_page_and_none_published(self, revenue_program):
        created_first = DonationPageFactory(published=False, revenue_program=revenue_program)
        # created second
        DonationPageFactory(published=False, revenue_program=revenue_program)
        assert get_page_to_be_set_as_default(revenue_program) == created_first


@pytest.mark.django_db
@pytest.mark.parametrize(
    (
        "is_connected",
        "created",
        "update_fields",
        "expect_published",
    ),
    [
        (True, True, {}, True),
        (True, False, {}, False),
        (True, False, {"activecampaign_server_url": "some-url"}, True),
        (True, False, {"activecampaign_access_token": "some-token"}, True),
        (True, False, {"activecampaign_server_url": "some-url", "activecampaign_access_token": "some-token"}, True),
    ],
)
def test_handle_rp_activecampaign_setup(
    is_connected: bool, created: bool, update_fields: dict, expect_published: bool, mocker
):
    publisher = mocker.patch("apps.organizations.models.Publisher")
    publisher.get_instance.return_value = mocker.MagicMock()
    mocker.patch(
        "apps.organizations.models.RevenueProgram.activecampaign_integration_connected",
        return_value=is_connected,
        new_callable=mocker.PropertyMock,
    )
    with mocker.patch("apps.google_cloud.pubsub.Publisher"):
        rp = RevenueProgramFactory()
        mock_publish = mocker.patch.object(rp, "publish_revenue_program_activecampaign_configuration_complete")
        handle_rp_activecampaign_setup(sender=mocker.Mock(), instance=rp, created=created, update_fields=update_fields)
        if expect_published:
            mock_publish.assert_called_once()
        else:
            mock_publish.assert_not_called()
