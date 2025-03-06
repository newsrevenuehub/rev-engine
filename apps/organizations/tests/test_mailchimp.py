import pytest
from mailchimp_marketing.api_client import ApiClientError

from apps.organizations.mailchimp import (
    MailchimpEmailList,
    MailchimpIntegrationError,
    MailchimpProduct,
    MailchimpRateLimitError,
    MailchimpSegment,
    MailchimpStore,
    RevenueProgramMailchimpClient,
    RevenueProgramMailChimpProductHelper,
)
from apps.organizations.mailchimp import (
    logger as mailchimp_logger,
)
from apps.organizations.typings import MailchimpProductType


@pytest.mark.django_db
class TestRevenueProgramMailchimpClient:
    def test_errors_if_rp_disconnected(self, revenue_program):
        with pytest.raises(MailchimpIntegrationError):
            RevenueProgramMailchimpClient(revenue_program)

    def test_create_product_happy_path(self, mc_connected_rp, mailchimp_product_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store_product", return_value=mailchimp_product_from_api)
        assert client.create_product("test-product-id", "test-product-name") == MailchimpProduct(
            **mailchimp_product_from_api
        )
        client.ecommerce.add_store_product.assert_called_with(
            mc_connected_rp.mailchimp_store_id,
            {
                "id": "test-product-id",
                "title": "test-product-name",
                "variants": [
                    {
                        "id": "test-product-id",
                        "title": "test-product-name",
                    }
                ],
            },
        )

    def test_create_product_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store_product", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_product("test-product-id", "test-product-name")

    def test_create_segment_happy_path(self, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker):
        test_options = {}
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "create_segment", return_value=mailchimp_contributor_segment_from_api)
        assert client.create_segment("test-segment-name", test_options) == MailchimpSegment(
            **mailchimp_contributor_segment_from_api
        )
        client.lists.create_segment.assert_called_with(
            mc_connected_rp.mailchimp_list_id,
            {"name": "test-segment-name", "options": test_options},
        )

    def test_create_segment_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "create_segment", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_segment("test-segment-name", {})

    def test_create_segment_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_segment("test-segment-name", {})

    def test_create_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.payment_provider",
            return_value=mocker.MagicMock(currency="usd"),
            new_callable=mocker.PropertyMock,
        )
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store", return_value=mailchimp_store_from_api)
        assert client.create_store() == MailchimpStore(**mailchimp_store_from_api)
        client.ecommerce.add_store.assert_called_with(
            {
                "id": mc_connected_rp.mailchimp_store_id,
                "list_id": mc_connected_rp.mailchimp_list_id,
                "name": mc_connected_rp.mailchimp_store_name,
                "currency_code": mc_connected_rp.payment_provider.currency,
            }
        )

    def test_create_store_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_create_store_payment_provider_unset(self, mc_connected_rp):
        mc_connected_rp.payment_provider = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_create_store_api_error(self, mc_connected_rp, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.payment_provider",
            return_value=mocker.MagicMock(currency="usd"),
            new_callable=mocker.PropertyMock,
        )
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "add_store", side_effect=ApiClientError("test-error"))
        with pytest.raises(MailchimpIntegrationError):
            client.create_store()

    def test_get_email_list_happy_path(self, mc_connected_rp, mailchimp_email_list_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_list", return_value=mailchimp_email_list_from_api)
        assert client.get_email_list() == MailchimpEmailList(**mailchimp_email_list_from_api)
        client.lists.get_list.assert_called_with(mc_connected_rp.mailchimp_list_id)

    def test_get_email_list_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_list", side_effect=ApiClientError("test-error"))
        assert client.get_email_list() is None

    def test_get_email_list_unset(self, mc_connected_rp):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        assert client.get_email_list() is None

    def test_get_product_happy_path(self, mc_connected_rp, mailchimp_product_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store_product", return_value=mailchimp_product_from_api)
        assert client.get_product("test_id") == MailchimpProduct(**mailchimp_product_from_api)
        client.ecommerce.get_store_product.assert_called_with(mc_connected_rp.mailchimp_store_id, "test_id")

    def test_get_product_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store_product", side_effect=ApiClientError("test-error"))
        assert client.get_product("test_id") is None

    def test_get_segment_happy_path(self, mc_connected_rp, mailchimp_contributor_segment_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_segment", return_value=mailchimp_contributor_segment_from_api)
        assert client.get_segment(123) == MailchimpSegment(**mailchimp_contributor_segment_from_api)
        client.lists.get_segment.assert_called_with(mc_connected_rp.mailchimp_list_id, 123)

    def test_get_segment_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.lists, "get_segment", side_effect=ApiClientError("test-error"))
        assert client.get_segment(123) is None

    def test_get_segment_list_unset(self, mc_connected_rp, mocker):
        mc_connected_rp.mailchimp_list_id = None
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        assert client.get_segment(123) is None

    def test_get_store_happy_path(self, mc_connected_rp, mailchimp_store_from_api, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store", return_value=mailchimp_store_from_api)
        assert client.get_store() == MailchimpStore(**mailchimp_store_from_api)
        client.ecommerce.get_store.assert_called_with(mc_connected_rp.mailchimp_store_id)

    def test_get_store_api_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        mocker.patch.object(client.ecommerce, "get_store", side_effect=ApiClientError("test-error"))
        assert client.get_store() is None

    def test_handle_read_404_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(mailchimp_logger, "debug")
        client._handle_read_error("test-entity", ApiClientError("test-error", 404), "debug")
        logger_spy.assert_called_with(
            "Mailchimp %s not found for RP %s, returning None", "test-entity", mc_connected_rp.id
        )

    def test_handle_read_429_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(mailchimp_logger, "warning")
        with pytest.raises(MailchimpRateLimitError):
            client._handle_read_error("test-entity", ApiClientError("test-error", 429))
        logger_spy.assert_called_with("Mailchimp rate limit exceeded for RP %s, raising exception", mc_connected_rp.id)

    def test_handle_write_429_error(self, mc_connected_rp, mocker):
        client = RevenueProgramMailchimpClient(mc_connected_rp)
        logger_spy = mocker.spy(mailchimp_logger, "warning")
        with pytest.raises(MailchimpRateLimitError):
            client._handle_write_error("test-entity", ApiClientError("test-error", 429))
        logger_spy.assert_called_with("Mailchimp rate limit exceeded for RP %s, raising exception", mc_connected_rp.id)


@pytest.mark.django_db
class TestRevenueProgramMailchimpProductHelper:

    @pytest.mark.parametrize("product_type", MailchimpProductType)
    def test_get_rp_product(self, product_type, mc_connected_rp, mailchimp_product_from_api, mocker):
        mocker.patch(
            "apps.organizations.mailchimp.RevenueProgramMailchimpClient.get_product",
            return_value=(product := MailchimpProduct(**mailchimp_product_from_api)),
        )
        assert RevenueProgramMailChimpProductHelper.get_rp_product(product_type, mc_connected_rp) == product

    @pytest.mark.parametrize("product_type", MailchimpProductType)
    def test_get_rp_product_id(self, product_type, mc_connected_rp):
        product_id = RevenueProgramMailChimpProductHelper.get_rp_product_id(product_type, mc_connected_rp)
        match product_type:
            case MailchimpProductType.ONE_TIME:
                assert product_id == f"rp-{mc_connected_rp.id}-one-time-contribution-product"
            case MailchimpProductType.MONTHLY:
                assert product_id == f"rp-{mc_connected_rp.id}-monthly-contribution-product"
            case MailchimpProductType.YEARLY:
                assert product_id == f"rp-{mc_connected_rp.id}-yearly-contribution-product"

    @pytest.mark.parametrize("product_type", MailchimpProductType)
    def test_get_rp_product_name(self, product_type):
        product_name = RevenueProgramMailChimpProductHelper.get_rp_product_name(product_type)
        match product_type:
            case MailchimpProductType.ONE_TIME:
                assert product_name == "one-time contribution"
            case MailchimpProductType.MONTHLY:
                assert product_name == "monthly contribution"
            case MailchimpProductType.YEARLY:
                assert product_name == "yearly contribution"
