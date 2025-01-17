from unittest.mock import Mock, PropertyMock

import pytest
from google.api_core.exceptions import NotFound
from rest_framework import status

from apps.organizations.models import RevenueProgram
from apps.organizations.tasks import (
    MailchimpAuthflowRetryableError,
    MailchimpAuthflowUnretryableError,
    exchange_mailchimp_oauth_code_for_server_prefix_and_access_token,
    exchange_mc_oauth_code_for_mc_access_token,
    get_mailchimp_server_prefix,
    logger,
    setup_mailchimp_entities_for_rp_mailing_list,
)
from apps.organizations.tests.factories import RevenueProgramFactory


@pytest.fixture
def _mailchimp_config(settings):
    for setting in ("MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"):
        setattr(settings, setting, "something")


class TestExchangeMailchimpOauthCodeForAccessToken:
    @pytest.mark.usefixtures("_mailchimp_config")
    def test_happy_path(self, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = {"access_token": (ac := "some-ac-token")}
        assert exchange_mc_oauth_code_for_mc_access_token("some-oauth-code") == ac

    @pytest.mark.parametrize(
        "config",
        [
            {"MAILCHIMP_CLIENT_ID": None, "MAILCHIMP_CLIENT_SECRET": "something"},
            {"MAILCHIMP_CLIENT_ID": "something", "MAILCHIMP_CLIENT_SECRET": None},
            {"MAILCHIMP_CLIENT_ID": None, "MAILCHIMP_CLIENT_SECRET": None},
        ],
    )
    def test_when_missing_config_vars(self, config, settings, mocker):
        for k, v in config.items():
            setattr(settings, k, v)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowUnretryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once()

    @pytest.mark.usefixtures("_mailchimp_config")
    def test_when_request_to_mc_non_success(self, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value.status_code = (code := status.HTTP_400_BAD_REQUEST)
        logger_spy = mocker.spy(logger, "error")
        with pytest.raises(MailchimpAuthflowRetryableError):
            exchange_mc_oauth_code_for_mc_access_token("some_oauth_code")
        logger_spy.assert_called_once_with(
            "`exchange_mc_oauth_code_for_mc_access_token` got an unexpected status code when trying to get an access token. "
            "The response status code is %s, and the response contained: %s",
            code,
            mock_post.return_value.json.return_value,
        )

    @pytest.mark.usefixtures("_mailchimp_config")
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
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_access_token", return_value="something")
        rp = RevenueProgramFactory(mailchimp_server_prefix="something")
        logger_spy = mocker.spy(logger, "info")
        save_spy = mocker.spy(RevenueProgram, "save")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        save_spy.assert_not_called()
        assert logger_spy.call_count == 2
        assert logger_spy.call_args_list[1][0][0] == (
            "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token called but retrieved RP already MC values set"
        )

    @pytest.mark.django_db(transaction=True)
    def test_happy_path_when_not_have_either_mc_property(self, mocker, settings):
        settings.ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = True
        settings.GOOGLE_CLOUD_PROJECT_ID = "some-project-id"
        mock_get_client = mocker.patch("apps.common.secrets_manager.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.side_effect = NotFound("Not found")
        mock_get_client.return_value.get_secret.side_effect = NotFound("Not found")
        mock_get_client.return_value.create_secret.return_value = mocker.Mock(name="secret")
        mocker.patch(
            "apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token", return_value=(token := "some-token")
        )
        mocker.patch("apps.organizations.tasks.get_mailchimp_server_prefix", return_value=(prefix := "some-prefix"))
        mocker.patch(
            "apps.common.secrets_manager.GoogleCloudSecretProvider.get_secret_path",
            return_value=(get_secret_path_val := "this-is-the-secret-path"),
        )
        mocker.patch(
            "apps.common.secrets_manager.GoogleCloudSecretProvider.get_secret_name",
            return_value=(secret_name := "secret-name"),
        )
        mock_create_revision = mocker.patch("reversion.create_revision")
        mock_create_revision.return_value.__enter__.return_value.add = mocker.Mock()
        mock_set_comment = mocker.patch("reversion.set_comment")
        revenue_program = RevenueProgramFactory()
        save_spy = mocker.spy(RevenueProgram, "save")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(revenue_program.id, "some-oauth-code")
        save_spy.assert_called_once_with(revenue_program, update_fields={"mailchimp_server_prefix", "modified"})
        mock_create_revision.assert_called_once()
        mock_set_comment.assert_called_once_with("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token")
        revenue_program.refresh_from_db()
        assert revenue_program.mailchimp_server_prefix == prefix
        mock_get_client.return_value.create_secret.assert_called_once_with(
            request={
                "parent": f"projects/{settings.GOOGLE_CLOUD_PROJECT_ID}",
                "secret_id": secret_name,
                "secret": {"replication": {"automatic": {}}},
            }
        )
        mock_get_client.return_value.add_secret_version.assert_called_once_with(
            request={
                "parent": get_secret_path_val,
                "payload": {"data": token.encode("ascii")},
            }
        )

    def test_happy_path_when_have_token_but_not_prefix(self, mocker):
        rp = RevenueProgramFactory(mailchimp_server_prefix=None)
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_access_token", return_value="something")
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
        mock_get_client = mocker.patch("apps.common.secrets_manager.get_secret_manager_client")
        mock_get_client.return_value.access_secret_version.side_effect = NotFound("Not found")
        mock_get_prefix = mocker.patch("apps.organizations.tasks.get_mailchimp_server_prefix")
        mock_get_token = mocker.patch(
            "apps.organizations.tasks.exchange_mc_oauth_code_for_mc_access_token", return_value="some-token"
        )
        rp = RevenueProgramFactory(mailchimp_server_prefix="some-prefix")
        exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp.id, "some-oauth-code")
        mock_get_prefix.assert_not_called()
        mock_get_token.assert_called_once()

    def test_when_get_token_request_raises_unretryable_error(self, mocker):
        rp = RevenueProgramFactory(mailchimp_server_prefix="some-prefix")
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
        rp = RevenueProgramFactory(mailchimp_server_prefix=None)
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_access_token", return_value=None)
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


@pytest.fixture
def mock_rp_mailchimp_store_truthy(mocker):
    return mocker.patch(
        "apps.organizations.tasks.RevenueProgram.mailchimp_store",
        new_callable=PropertyMock,
        return_value=Mock(id="something"),
    )


@pytest.mark.django_db(transaction=True)
@pytest.mark.celery(result_backend="django-db", cache_backend="django-cache")
class TestSetupMailchimpEntitiesForRpMailingList:
    def test_happy_path(
        self,
        settings,
        mocker,
        revenue_program,
        celery_session_worker,
    ):
        settings.RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC = "some-topic"
        mock_ensure_entities_fn = mocker.patch("apps.organizations.models.RevenueProgram.ensure_mailchimp_entities")
        mock_publish_revenue_program_mailchimp_list_configuration_complete_fn = mocker.patch(
            "apps.organizations.models.RevenueProgram.publish_revenue_program_mailchimp_list_configuration_complete",
        )
        setup_mailchimp_entities_for_rp_mailing_list.delay(revenue_program.id).wait()
        mock_ensure_entities_fn.assert_called_once()
        mock_publish_revenue_program_mailchimp_list_configuration_complete_fn.assert_called_once()
