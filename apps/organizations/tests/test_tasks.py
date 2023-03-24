import pytest
from rest_framework import status

from apps.organizations.models import RevenueProgram
from apps.organizations.tasks import (
    MailchimpAuthflowRetryableError,
    MailchimpAuthflowUnretryableError,
    exchange_mailchimp_oauth_code_for_server_prefix_and_access_token,
    exchange_mc_oauth_code_for_mc_access_token,
    get_mailchimp_server_prefix,
    logger,
)
from apps.organizations.tests.factories import RevenueProgramFactory


class TestExchangeMailchimpOauthCodeForAccessToken:
    def test_happy_path(self, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = {"access_token": (ac := "some-ac-token")}
        assert exchange_mc_oauth_code_for_mc_access_token("some-oauth-code") == ac

    @pytest.mark.parametrize("settings_var", ("MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"))
    def test_when_missing_config_vars(self, settings_var, settings, mocker):
        setattr(settings, settings_var, None)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowUnretryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once_with(
            "`exchange_mc_oauth_code_for_mc_access_token` called but app is missing required config vars: %s",
            ", ".join([settings_var]),
        )

    def test_when_request_to_mc_non_success(self, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = (code := status.HTTP_400_BAD_REQUEST)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowRetryableError):
            exchange_mc_oauth_code_for_mc_access_token(oauth_code := "some_oauth_code")
        logger_spy.assert_called_once_with(
            (
                "`exchange_mc_oauth_code_for_mc_access_token` got an unexpected status code when trying to get an access token. "
                "The oauth_code is %s, and the response status code is %s"
            ),
            oauth_code,
            code,
        )

    def test_when_response_body_missing_access_token(self, mocker):
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
