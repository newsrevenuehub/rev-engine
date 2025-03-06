from apps.common import StrEnum


class MailchimpProductType(StrEnum):
    """Names of distinct products we create in Mailchimp.

    These values get used as the "title" property when creating
    a variant for the product in Mailchimp.
    """

    ONE_TIME = "one_time"
    YEARLY = "yearly"
    MONTHLY = "monthly"

    def as_mailchimp_product_name(self) -> str:
        return f"{self} contribution".replace("_", "-")

    def as_rp_field(self) -> str:
        return f"mailchimp_{self}_contribution_product"

    def as_mailchimp_product_id(self, revenue_program_id: int) -> str:
        return f"rp-{self}-{revenue_program_id}-contribution-product".replace("_", "-")


class MailchimpSegmentName(StrEnum):
    """Names of segments we create in Mailchimp.

    These values get used as the "name" property when creating a segment in Mailchimp.
    """

    ALL_CONTRIBUTORS = "all_contributors"
    ONE_TIME_CONTRIBUTORS = "one_time_contributors"
    RECURRING_CONTRIBUTORS = "recurring_contributors"
    MONTHLY_CONTRIBUTORS = "monthly_contributors"
    YEARLY_CONTRIBUTORS = "yearly_contributors"

    def as_rp_field(self) -> str:
        return f"mailchimp_{self}_segment"

    def as_rp_id_field(self) -> str:
        return f"mailchimp_{self}_segment_id"
