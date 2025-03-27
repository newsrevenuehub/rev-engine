from typing import Literal, TypedDict

from typing_extensions import NotRequired

from apps.common import StrEnum


class MailchimpProductType(StrEnum):
    """Names of distinct products we create in Mailchimp.

    These values get used as the "title" property when creating
    a variant for the product in Mailchimp.
    """

    ONE_TIME = "one_time"
    RECURRING = "recurring"
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


class MailchimpSegmentConditionSchema(TypedDict):
    """Schema for a condition in a Mailchimp segment.

    Note that at present we only use EcommPurchased and EcommProd in our segment
    condition schemas. Some SegmentConditionSchemas (for instance IPGeoIn) require
    additional fields, which are not yet implemented here.

    Se https://mailchimp.com/developer/marketing/docs/alternative-schemas/#segment-condition-schemas
    for more information.
    """

    condition_type: Literal["EcommCategory", "EcommPurchased"]
    field: str
    op: str
    value: NotRequired[str]


class MailchimpSegmentOptions(TypedDict):
    """Schema for a Mailchimp segment option.

    This schema is used when creating a segment in Mailchimp.
    """

    match: Literal["any", "all"]
    conditions: list[MailchimpSegmentConditionSchema]


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

    def get_segment_options(self) -> MailchimpSegmentOptions:
        """Return the configuration for creating a segment in Mailchimp."""
        match self:
            case MailchimpSegmentName.ALL_CONTRIBUTORS:
                return MailchimpSegmentOptions(
                    match="all",
                    conditions=[
                        MailchimpSegmentConditionSchema(
                            condition_type="EcommPurchased", field="ecomm_purchased", op="member"
                        )
                    ],
                )
            case MailchimpSegmentName.ONE_TIME_CONTRIBUTORS:
                return MailchimpSegmentOptions(
                    match="all",
                    conditions=[
                        MailchimpSegmentConditionSchema(
                            field="ecomm_prod",
                            op="is",
                            condition_type="EcommCategory",
                            value=MailchimpProductType.ONE_TIME.as_mailchimp_product_name(),
                        ),
                    ],
                )
            case MailchimpSegmentName.RECURRING_CONTRIBUTORS:
                return MailchimpSegmentOptions(
                    match="any",
                    conditions=[
                        MailchimpSegmentConditionSchema(
                            field="ecomm_prod",
                            op="is",
                            condition_type="EcommCategory",
                            value=MailchimpProductType.YEARLY.as_mailchimp_product_name(),
                        ),
                        MailchimpSegmentConditionSchema(
                            field="ecomm_prod",
                            op="is",
                            condition_type="EcommCategory",
                            value=MailchimpProductType.MONTHLY.as_mailchimp_product_name(),
                        ),
                    ],
                )

            case MailchimpSegmentName.MONTHLY_CONTRIBUTORS:
                return MailchimpSegmentOptions(
                    match="all",
                    conditions=[
                        MailchimpSegmentConditionSchema(
                            field="ecomm_prod",
                            op="is",
                            condition_type="EcommCategory",
                            value=MailchimpProductType.MONTHLY.as_mailchimp_product_name(),
                        ),
                    ],
                )

            # pragma added here because the non-match case is not covered by the test. That's okay because in reality
            # we will never hit this case because if you were to do MailchimpSegmentName("unexpected") it would raise
            # a ValueError. Without the pragma, pytest-cov reports that this line is only partially covered.
            case MailchimpSegmentName.YEARLY_CONTRIBUTORS:  # pragma: no branch
                return MailchimpSegmentOptions(
                    match="all",
                    conditions=[
                        MailchimpSegmentConditionSchema(
                            field="ecomm_prod",
                            op="is",
                            condition_type="EcommCategory",
                            value=MailchimpProductType.YEARLY.as_mailchimp_product_name(),
                        ),
                    ],
                )
