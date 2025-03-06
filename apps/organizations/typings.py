from apps.common import StrEnum


class MailchimpProductType(StrEnum):
    """Names of distinct products we create in Mailchimp.

    These values get used as the "title" property when creating
    a variant for the product in Mailchimp.
    """

    ONE_TIME = "one_time"
    YEARLY = "yearly"
    MONTHLY = "monthly"


class MailchimpProductName(StrEnum):
    """Names of products we create in Mailchimp.

    These values get used as the "value" property when creating Mailchimp segment conditions
    """

    ONE_TIME = "one-time contribution"
    MONTHLY = f"{MailchimpProductType.MONTHLY} contribution"
    YEARLY = f"{MailchimpProductType.YEARLY} contribution"


# These refer to properties on the RevenueProgram model
class RevenueProgramMailchimpProductField(StrEnum):
    """Names of properties on the RevenueProgram model that return Mailchimp products."""

    ONE_TIME = f"mailchimp_{MailchimpProductType.ONE_TIME}_contribution_product"
    MONTHLY = f"mailchimp_{MailchimpProductType.MONTHLY}_contribution_product"
    YEARLY = f"mailchimp_{MailchimpProductName.YEARLY}_contribution_product"


class MailchimpSegmentName(StrEnum):
    """Names of segments we create in Mailchimp.

    These values get used as the "name" property when creating a segment in Mailchimp.
    """

    ALL_CONTRIBUTORS = "all_contributors"
    ONE_TIME_CONTRIBUTORS = "one_time_contributors"
    RECURRING_CONTRIBUTORS = "recurring_contributors"
    MONTHLY_CONTRIBUTORS = "monthly_contributors"
    YEARLY_CONTRIBUTORS = "yearly_contributors"


class RevenueProgramMailchimpSegmentIdField(StrEnum):
    """Names of fields on the RevenueProgram model that store Mailchimp segment IDs."""

    ALL_CONTRIBUTORS = f"mailchimp_{MailchimpSegmentName.ALL_CONTRIBUTORS}_segment_id"
    ONE_TIME_CONTRIBUTORS = f"mailchimp_{MailchimpSegmentName.ONE_TIME_CONTRIBUTORS}_segment_id"
    RECURRING_CONTRIBUTORS = f"mailchimp_{MailchimpSegmentName.RECURRING_CONTRIBUTORS}_segment_id"
    MONTHLY_CONTRIBUTORS = f"mailchimp_{MailchimpSegmentName.MONTHLY_CONTRIBUTORS}_segment_id"
    YEARLY_CONTRIBUTORS = f"mailchimp_{MailchimpSegmentName.YEARLY_CONTRIBUTORS}_segment_id"
