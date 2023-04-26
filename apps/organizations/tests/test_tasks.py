from unittest.mock import MagicMock, Mock, PropertyMock

import pytest
from rest_framework import status

from apps.organizations.models import RevenueProgram
from apps.organizations.tasks import (
    MailchimpAuthflowRetryableError,
    MailchimpAuthflowUnretryableError,
    ensure_mailchimp_contributor_segment,
    ensure_mailchimp_product,
    ensure_mailchimp_recurring_contributor_segment,
    ensure_mailchimp_store,
    exchange_mailchimp_oauth_code_for_server_prefix_and_access_token,
    exchange_mc_oauth_code_for_mc_access_token,
    get_mailchimp_server_prefix,
    logger,
    setup_mailchimp_entities_for_rp_mailing_list,
)
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.fixture
def mailchimp_config(settings):
    for setting in ("MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"):
        setattr(settings, setting, "something")


class TestExchangeMailchimpOauthCodeForAccessToken:
    def test_happy_path(self, mocker, mailchimp_config):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = {"access_token": (ac := "some-ac-token")}
        assert exchange_mc_oauth_code_for_mc_access_token("some-oauth-code") == ac

    @pytest.mark.parametrize(
        "config",
        (
            {"MAILCHIMP_CLIENT_ID": None, "MAILCHIMP_CLIENT_SECRET": "something"},
            {"MAILCHIMP_CLIENT_ID": "something", "MAILCHIMP_CLIENT_SECRET": None},
            {"MAILCHIMP_CLIENT_ID": None, "MAILCHIMP_CLIENT_SECRET": None},
        ),
    )
    def test_when_missing_config_vars(self, config, settings, mocker):
        for k, v in config.items():
            setattr(settings, k, v)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowUnretryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once()

    def test_when_request_to_mc_non_success(self, mocker, mailchimp_config):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = (code := status.HTTP_400_BAD_REQUEST)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowRetryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once_with(
            (
                "`exchange_mc_oauth_code_for_mc_access_token` got an unexpected status code when trying to get an access token. "
                "The response status code is %s, and the response contained: %s"
            ),
            code,
            mock_post.return_value.json.return_value,
        )

    def test_when_response_body_missing_access_token(self, mocker, mailchimp_config):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = {}
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowUnretryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once_with(
            "`exchange_mc_oauth_code_for_mc_access_token` got a response body missing an `access_token` parameter from Mailchimp"
        )


class TestGetMailchimpServerPrefix:
    def test_happy_path(self, mocker):
        mock_get = mocker.patch("requests.get")
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.json.return_value = {"dc": (token := "some-token")}
        assert get_mailchimp_server_prefix("some-access-token") == token

    def test_when_request_to_mc_fails(self, mocker):
        mock_get = mocker.patch("requests.get")
        mock_get.return_value.status_code = (code := status.HTTP_400_BAD_REQUEST)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowRetryableError):
            get_mailchimp_server_prefix("some-access-token")
        logger_spy.assert_called_once_with(
            "get_mailchimp_server_prefix called but got a non-200 status code: %s",
            code,
        )

    def test_when_response_body_missing_dc(self, mocker):
        mock_get = mocker.patch("requests.get")
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.json.return_value = {}
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowUnretryableError):
            get_mailchimp_server_prefix("some-access-token")
        logger_spy.assert_called_once_with(
            "`get_mailchimp_server_prefix` got a response body missing a `dc` parameter from Mailchimp when trying to get a server prefix"
        )


@pytest.mark.django_db
class TestExchangeMailchimpOauthTokenForServerPrefixAndAccessToken:
    def test_when_revenue_program_not_found(self, revenue_program, mocker):
        logger_spy = mocker.spy(logger, "error")
        save_spy = mocker.spy(RevenueProgram, "save")
        rp_id = revenue_program.id
        revenue_program.delete()
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp_id, "some-oauth-code")
        logger_spy.assert_called_once_with(
            "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token cannot find revenue program with ID %s",
            rp_id,
        )
        save_spy.assert_not_called()

    def test_when_rp_already_has_mc_properties_set(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token="something", mailchimp_server_prefix="something")
        logger_spy = mocker.spy(logger, "info")
        save_spy = mocker.spy(RevenueProgram, "save")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_not_called()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1][0][0] == (
            "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token called but retrieved RP already MC values set"
        )

    def test_happy_path_when_not_have_either_mc_property(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token=None, mailchimp_server_prefix=None)
        mocker.patch(
            "apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token", return_value=(code := "some-token")
        )
        mocker.patch("apps.organizations.tasks.get_mailchimp_server_prefix", return_value=(prefix := "some-prefix"))
        save_spy = mocker.spy(RevenueProgram, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_called_once_with(
            rp, update_fields={"mailchimp_access_token", "mailchimp_server_prefix", "modified"}
        )
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token")
        rp.refresh_from_db()
        assert rp.mailchimp_access_token == code
        assert rp.mailchimp_server_prefix == prefix

    def test_happy_path_when_have_token_but_not_prefix(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token="some-token", mailchimp_server_prefix=None)
        get_token_spy = mocker.patch("apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token")
        mocker.patch("apps.organizations.tasks.get_mailchimp_server_prefix", return_value=(prefix := "some-prefix"))
        save_spy = mocker.spy(RevenueProgram, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_called_once_with(rp, update_fields={"mailchimp_server_prefix", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token")
        get_token_spy.assert_not_called()
        rp.refresh_from_db()
        assert rp.mailchimp_server_prefix == prefix

    def test_happy_path_when_not_have_token_but_have_prefix(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token=None, mailchimp_server_prefix="some-prefix")
        mock_get_prefix = mocker.patch("apps.organizations.tasks.get_mailchimp_server_prefix")
        mocker.patch(
            "apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token", return_value=(token := "some-token")
        )
        save_spy = mocker.spy(RevenueProgram, "save")
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_called_once_with(rp, update_fields={"mailchimp_access_token", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token")
        mock_get_prefix.assert_not_called()
        rp.refresh_from_db()
        assert rp.mailchimp_access_token == token

    def test_when_get_token_request_raises_unretryable_error(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token=None, mailchimp_server_prefix="some-prefix")
        logger_spy = mocker.spy(logger, "exception")
        mocker.patch(
            "apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token",
            side_effect=MailchimpAuthflowUnretryableError("Uh oh"),
        )
        save_spy = mocker.spy(RevenueProgram, "save")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_not_called()
        logger_spy.assert_called_once_with(
            "`exchange_mailchimp_oauth_code_for_server_prefix_and_access_token` encountered an unrecoverable error "
            "procesesing revenue program with ID %s",
            rp.id,
        )
        rp.refresh_from_db()
        assert rp.mailchimp_access_token is None

    def test_when_get_server_prefix_request_raises_unretryable_error(self, mocker):
        rp = RevenueProgramFactory(mailchimp_access_token="some-token", mailchimp_server_prefix=None)
        mocker.patch(
            "apps.organizations.tasks.get_mailchimp_server_prefix",
            side_effect=MailchimpAuthflowUnretryableError("Uh oh"),
        )
        save_spy = mocker.spy(RevenueProgram, "save")
        logger_spy = mocker.spy(logger, "exception")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_not_called()
        logger_spy.assert_called_once_with(
            "`exchange_mailchimp_oauth_code_for_server_prefix_and_access_token` encountered an unrecoverable error "
            "procesesing revenue program with ID %s",
            rp.id,
        )
        rp.refresh_from_db()
        assert rp.mailchimp_server_prefix is None


@pytest.mark.django_db
def test_setup_mailchimp_entities_for_rp_mailing_list(
    mocker, settings, revenue_program, celery_app, celery_session_worker
):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    mock_ensure_mailchimp_store = mocker.patch(
        "apps.organizations.tasks.ensure_mailchimp_store.apply_async", return_value=MagicMock()
    )
    mock_ensure_mailchimp_product = mocker.patch(
        "apps.organizations.tasks.ensure_mailchimp_product.s", return_value=MagicMock()
    )
    mock_ensure_contributor_segment = mocker.patch(
        "apps.organizations.tasks.ensure_mailchimp_contributor_segment", return_value=MagicMock()
    )
    mock_ensure_recurring_contributor_segment = mocker.patch(
        "apps.organizations.tasks.ensure_mailchimp_recurring_contributor_segment", return_value=MagicMock()
    )
    setup_mailchimp_entities_for_rp_mailing_list.apply(args=(revenue_program.id,)).get()
    mock_ensure_mailchimp_store.assert_called_once_with((revenue_program.id,), link=mock_ensure_mailchimp_product)
    mock_ensure_mailchimp_product.assert_called_once_with(revenue_program.id)

    mock_ensure_contributor_segment.assert_called_once_with(revenue_program.id)
    mock_ensure_recurring_contributor_segment.assert_called_once_with(revenue_program.id)


@pytest.mark.django_db
class TestEnsureMailchimpStore:
    def test_when_no_store_exists(self, revenue_program, mocker):
        revenue_program.mailchimp_store_id = None
        revenue_program.save()
        save_spy = mocker.spy(RevenueProgram, "save")
        my_id = "some-id"
        mock_make_store = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_store", return_value=Mock(id=my_id)
        )
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        ensure_mailchimp_store.apply(args=(revenue_program.id,)).get()
        mock_make_store.assert_called_once()
        save_spy.assert_called_once_with(revenue_program, update_fields={"mailchimp_store_id", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with("ensure_mailchimp_store ran")

    def test_when_store_already_exists(self, mocker, revenue_program):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_store", return_value="something-truthy")
        logger_spy = mocker.spy(logger, "info")
        ensure_mailchimp_store.apply(args=(revenue_program.id,)).get()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1] == mocker.call(
            "[ensure_mailchimp_store] store already exists for rp_id=[%s]", revenue_program.id
        )


@pytest.mark.django_db
class TestEnsureMailchimpProduct:
    def test_when_no_product_exists(self, revenue_program, mocker):
        revenue_program.mailchimp_product_id = None
        revenue_program.save()
        save_spy = mocker.spy(RevenueProgram, "save")
        my_id = "some-id"
        mock_make_product = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_product", return_value=Mock(id=my_id)
        )
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.__enter__.return_value = None
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        ensure_mailchimp_product.apply(args=(revenue_program.id,)).get()
        mock_make_product.assert_called_once()
        save_spy.assert_called_once_with(revenue_program, update_fields={"mailchimp_product_id", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_revision_comment.assert_called_once_with("ensure_mailchimp_product ran")

    def test_when_product_already_exists(self, mocker, revenue_program):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_product", return_value="something-truthy")
        logger_spy = mocker.spy(logger, "info")
        ensure_mailchimp_product.apply(args=(revenue_program.id,)).get()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1] == mocker.call(
            "[ensure_mailchimp_product] product already exists for rp_id=[%s]", revenue_program.id
        )


@pytest.mark.django_db
class TestEnsureMailchimpContributorSegment:
    def test_when_no_existing_contributor_segment(self, revenue_program, mocker):
        revenue_program.mailchimp_access_token = "something-truthy"
        revenue_program.mailchimp_server_prefix = "something-truthy"
        revenue_program.mailchimp_list_id = "something-truthy"
        revenue_program.save()
        my_id = "some-id"
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_contributor_segment",
            return_value=None,
            new_callable=PropertyMock,
        )
        mock_make_contributor_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_contributor_segment",
            return_value=Mock(id=my_id),
        )
        ensure_mailchimp_contributor_segment.apply(args=(revenue_program.id,)).get()
        mock_make_contributor_segment.assert_called_once()

    def test_when_contributor_segment_already_exists(self, revenue_program, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_contributor_segment",
            return_value="something-truthy",
            new_callable=PropertyMock,
        )
        logger_spy = mocker.spy(logger, "info")
        ensure_mailchimp_contributor_segment.apply(args=(revenue_program.id,)).get()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1] == mocker.call("Segment already exists for rp_id=[%s]", revenue_program.id)


@pytest.mark.django_db
class TestEnsureMailchimpRecurringContributorSegment:
    def test_when_no_existing_recurring_segment(self, revenue_program, mocker):
        revenue_program.mailchimp_access_token = "something-truthy"
        revenue_program.mailchimp_server_prefix = "something-truthy"
        revenue_program.mailchimp_list_id = "something-truthy"
        revenue_program.save()
        my_id = "some-id"
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_segment",
            return_value=None,
            new_callable=PropertyMock,
        )
        mock_make_recurring_segment = mocker.patch(
            "apps.organizations.models.RevenueProgram.make_mailchimp_recurring_segment",
            return_value=Mock(id=my_id),
        )
        ensure_mailchimp_recurring_contributor_segment.apply(args=(revenue_program.id,)).get()
        mock_make_recurring_segment.assert_called_once()

    def test_when_recurring_segment_already_exists(self, revenue_program, mocker):
        revenue_program.mailchimp_access_token = "something-truthy"
        revenue_program.mailchimp_server_prefix = "something-truthy"
        revenue_program.mailchimp_list_id = "something-truthy"
        revenue_program.save()
        mocker.patch(
            "apps.organizations.models.RevenueProgram.mailchimp_recurring_segment",
            return_value="something-truthy",
            new_callable=PropertyMock,
        )
        logger_spy = mocker.spy(logger, "info")
        ensure_mailchimp_recurring_contributor_segment.apply(args=(revenue_program.id,)).get()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1] == mocker.call("Segment already exists for rp_id=[%s]", revenue_program.id)
