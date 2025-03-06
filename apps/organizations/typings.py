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

    ALL_CONTRIBUTORS = "All Contributors"
    ONE_TIME_CONTRIBUTORS = "One-time contributors"
    RECURRING_CONTRIBUTORS = "Recurring contributors"
    MONTHLY_CONTRIBUTORS = "Monthly contributors"
    YEARLY_CONTRIBUTORS = "Yearly contributors"

    def _machine_cased(self) -> str:
        return self.lower().replace(" ", "_").replace("-", "_")

    def as_rp_field(self) -> str:
        return f"mailchimp_{self._machine_cased()}_segment"

    def as_rp_id_field(self) -> str:
        return f"mailchimp_{self._machine_cased()}_segment_id"
