import typing

from apps.common.typings import StrEnum


if typing.TYPE_CHECKING:  # pragma: no cover
    from apps.organizations.mailchimp import MailchimpProduct
    from apps.organizations.models import RevenueProgram


class MailchimpProductType(StrEnum):
    ONE_TIME = "one_time"
    YEAR = "year"
    MONTH = "month"

    @staticmethod
    def get_rp_product(product_type: str, rp: "RevenueProgram") -> "MailchimpProduct":
        product_field = f"mailchimp_{product_type}_contribution_product"
        return getattr(rp, product_field)

    @staticmethod
    def get_rp_product_id(product_type: str) -> str:
        return f"mailchimp_{product_type}_contribution_product_id"

    @staticmethod
    def get_rp_product_name(product_type: str) -> str:
        match product_type:
            case MailchimpProductType.ONE_TIME:
                return MailchimpProductName.ONE_TIME
            case MailchimpProductType.YEAR:
                return MailchimpProductName.YEARLY
            case MailchimpProductType.MONTH:
                return MailchimpProductName.MONTHLY


class MailchimpSegmentType(StrEnum):
    ALL_CONTRIBUTORS = "all_contributors"
    # question is it okay for this to change?
    ONE_TIME_CONTRIBUTORS = "one_time_contributor"
    # can this change to plural?
    RECURRING_CONTRIBUTORS = "recurring_contributor"
    MONTHLY_CONTRIBUTORS = "monthly_contributor"
    YEARLY_CONTRIBUTORS = "yearly_contributor"


class MailchimpProductName(StrEnum):
    ONE_TIME = "one-time contribution"
    MONTHLY = "monthly contribution"
    YEARLY = "yearly contribution"
