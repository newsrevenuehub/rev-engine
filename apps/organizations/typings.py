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
        """Return the name of the product as it should be in Mailchimp.

        This value is used as the "title" property when creating a product in Mailchimp.
        """
        return f"{self} contribution".replace("_", "-")

    def as_rp_field(self) -> str:
        """Return the name of the field in the RevenueProgram model that stores the product ID."""
        return f"mailchimp_{self}_contribution_product"

    def as_mailchimp_product_id(self, revenue_program_id: int) -> str:
        """Return the ID of the product as it should be in Mailchimp.

        This value is used as the "id" property when creating a product in Mailchimp.
        """
        return f"rp-{revenue_program_id}-{self}-contribution-product".replace("_", "-")


class MailchimpSegmentName(StrEnum):
    """Names of segments we create in Mailchimp.

    These values get used as the "name" property when creating a segment in Mailchimp.
    """

    ALL_CONTRIBUTORS = "All contributors"
    ONE_TIME_CONTRIBUTORS = "One-time contributors"
    RECURRING_CONTRIBUTORS = "Recurring contributors"
    MONTHLY_CONTRIBUTORS = "Monthly contributors"
    YEARLY_CONTRIBUTORS = "Yearly contributors"

    def _machine_cased(self) -> str:
        return self.lower().replace(" ", "_").replace("-", "_")

    def as_rp_field(self) -> str:
        """Return the name of the field in the RevenueProgram model that returns the product."""
        return f"mailchimp_{self._machine_cased()}_segment"

    def as_rp_id_field(self) -> str:
        """Return the model field that stores the segment ID in NRE.

        This value represents the field the ID gets saved back to on the model after a segment is created.
        """
        return f"mailchimp_{self._machine_cased()}_segment_id"

    def get_segment_creation_config(self):
        """Return the configuration for creating a segment in Mailchimp."""
        is_condition = {"field": "ecomm_prod", "op": "is"}
        match self:
            case MailchimpSegmentName.ALL_CONTRIBUTORS:
                return {
                    "match": "all",
                    "conditions": [{"field": "ecomm_purchased", "op": "member"}],
                }

            case MailchimpSegmentName.ONE_TIME_CONTRIBUTORS:
                return {
                    "match": "all",
                    "conditions": [
                        {**is_condition, "value": MailchimpProductType.ONE_TIME.as_mailchimp_product_name()},
                    ],
                }

            case MailchimpSegmentName.RECURRING_CONTRIBUTORS:
                return {
                    "match": "any",
                    "conditions": [
                        {
                            **is_condition,
                            "value": MailchimpProductType.YEARLY.as_mailchimp_product_name(),
                        },
                        {
                            **is_condition,
                            "value": MailchimpProductType.MONTHLY.as_mailchimp_product_name(),
                        },
                    ],
                }

            case MailchimpSegmentName.MONTHLY_CONTRIBUTORS:
                return {
                    "match": "all",
                    "conditions": [
                        {**is_condition, "value": MailchimpProductType.MONTHLY.as_mailchimp_product_name()},
                    ],
                }
            case MailchimpSegmentName.YEARLY_CONTRIBUTORS:
                return {
                    "match": "all",
                    "conditions": [
                        {**is_condition, "value": MailchimpProductType.YEARLY.as_mailchimp_product_name()},
                    ],
                }
