import logging
import re
from typing import Any, ClassVar, Literal, NamedTuple

from django.conf import settings

import pydantic

from apps.contributions.exceptions import InvalidMetadataError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StripeEventData(NamedTuple):
    id: str
    object: str
    account: str
    api_version: str
    created: int
    data: Any
    request: Any
    livemode: bool
    pending_webhooks: int
    type: str


class StripeMetadataSchemaBase(pydantic.BaseModel):
    """Schema.

    - validates that all required fields are present
    - validates that extra fields are not present
    - provides default values for some optional fields
    - normalizes boolean values.
    """

    schema_version: Literal["1.4"]
    source: Literal["rev-engine"]

    METADATA_TEXT_MAX_LENGTH: ClassVar[int] = 500

    class Config:
        extra = "forbid"

    @classmethod
    def normalize_boolean(cls, v: Any) -> bool | None:
        """Normalize boolean values.

        Convert some known values to their boolean counterpart, while still allowing
        for a `None` value which indicates that the value was not provided.
        """
        logger.debug("Normalizing boolean value %s", v)
        if any([isinstance(v, bool), v is None]):
            return v
        if isinstance(v, str):
            if v.lower().strip() in ["false", "none", "no", "n"]:
                return False
            if v.lower().strip() in ["true", "yes", "y"]:
                return True
        raise ValueError("Value must be a boolean, None, or castable string")

    @pydantic.validator("*", pre=True, always=True)
    def truncate_strings(cls, v: Any) -> str | None:
        """Truncate strings.

        This validator is responsible for ensuring that all string fields are no longer than
        METADATA_TEXT_MAX_LENGTH characters.
        """
        if isinstance(v, str):
            return v[: cls.METADATA_TEXT_MAX_LENGTH]
        return v


class StripePaymentMetadataSchemaV1_0(StripeMetadataSchemaBase):
    schema_version: Literal["1.0"]
    source: Literal["rev-engine", "newspack"]
    contributor_id: str | None = None
    agreed_to_pay_fees: bool
    donor_selected_amount: float
    reason_for_giving: str | None = None
    referer: pydantic.HttpUrl
    revenue_program_id: str
    revenue_program_slug: str
    sf_campaign_id: str | None = None
    comp_subscription: str | None = None
    honoree: str | None = None
    in_memory_of: str | None = None
    swag_opt_out: bool | None = False
    t_shirt_size: str | None = None
    company_name: str | None = None

    class Config:
        extra = "forbid"

    @pydantic.validator("agreed_to_pay_fees", "swag_opt_out")
    def validate_booleans(cls, v):
        return cls.normalize_boolean(v)


class StripePaymentMetadataSchemaV1_1(StripePaymentMetadataSchemaV1_0):
    # NB our stripe metadata schema versioning is for a schema shared by > 1 kind of
    # stripe object. In case of 1.0 vs. 1.1 for payment data (subscriptions and payment intents),
    # the only difference is the source field definition and the schema version.
    schema_version: Literal["1.1"]
    source: Literal["rev-engine"]


# NB: 1.2 is obsolete and was never used


class StripePaymentMetadataSchemaV1_3(StripeMetadataSchemaBase):
    schema_version: Literal["1.3"]
    source: Literal["legacy-migration"]
    agreed_to_pay_fees: bool
    revenue_program_id: str
    revenue_program_slug: str
    recurring_donation_id: str

    class Config:
        extra = "forbid"

    @pydantic.validator("agreed_to_pay_fees")
    @classmethod
    def validate_booleans(cls, v):
        return cls.normalize_boolean(v)


class StripePaymentMetadataSchemaV1_4(StripeMetadataSchemaBase):
    """Schema used for generating metadata on Stripe payment intents and subscriptions."""

    agreed_to_pay_fees: bool
    donor_selected_amount: float
    referer: pydantic.HttpUrl
    revenue_program_id: str
    revenue_program_slug: str

    contributor_id: str | None = None
    comp_subscription: str | None = None
    company_name: str | None = None
    honoree: str | None = None
    in_memory_of: str | None = None
    reason_for_giving: str | None = None
    sf_campaign_id: str | None = None
    mc_campaign_id: str | None = None
    swag_choices: str | None = None
    swag_opt_out: bool | None = False
    schema_version: Literal["1.4"]

    SWAG_CHOICES_DELIMITER: ClassVar[str] = ";"
    SWAG_SUB_CHOICE_DELIMITER: ClassVar[str] = ":"

    class Config:
        extra = "forbid"

    @pydantic.validator("contributor_id", "revenue_program_id", pre=True)
    def convert_id_to_string(cls, v: Any) -> str | None:
        """Convert id to string.

        This validator is responsible for ensuring that the field is a string. These fields are naturally
        integers on their way in, but the metadata schema in Switchboard calls for them to be strings.
        """
        if v is None:
            return v
        return str(v)

    @pydantic.validator("agreed_to_pay_fees", "swag_opt_out")
    @classmethod
    def validate_booleans(cls, v: Any) -> bool | None:
        """Validate booleans.

        This validator is responsible for ensuring that the agreed_to_pay_fees and swag_opt_out fields are valid.
        """
        return cls.normalize_boolean(v)

    @pydantic.validator("swag_choices")
    def validate_swag_choices(cls, v: Any) -> str | None:
        """Validate swag_choices.

        This validator is responsible for ensuring that the swag_choices field is valid.

        """
        # if empty or none, return
        if not v:
            return v
        if len(v) > settings.METADATA_MAX_SWAG_CHOICES_LENGTH:
            raise ValueError("swag_choices is too long")
        choices = v.split(cls.SWAG_CHOICES_DELIMITER)
        # for instance, "tshirt" or "tshirt:hoodie"
        choice_pattern = rf"[\w-]+({cls.SWAG_SUB_CHOICE_DELIMITER}[\w]+)?"
        for choice in choices:
            # we check if choice is truthy to allow for case of a hanging `;` leading to an empty choice
            if choice and not re.fullmatch(choice_pattern, choice):
                raise ValueError("swag_choices is not valid")
        return v


class StripePaymentMetadataSchemaV1_5(StripePaymentMetadataSchemaV1_4):
    schema_version: Literal["1.5"]
    source: Literal["external-migration"]

    # 1.5 omits this field from 1.4, with which it otherwise shares a schema
    contributor_id: None = None
    # ID of the payment/subscription in the originating/external system
    external_id: str | None = None
    # Only would be on subscription, not payment intent. The Salesforce Recurring Donation ID, if any.
    recurring_donation_id: str | None = None
    # 1.4 has this field, but it's required
    referer: pydantic.HttpUrl | None = None

    class Config:
        # 1.5 omits this field from 1.4, with which it otherwise shares a schema. We default value to None above,
        # but here we need to also exclude so it doesn't show up when converting to dict
        exclude = {"contributor_id"}
        extra = "forbid"


class StripePaymentMetadataSchemaV1_6(StripeMetadataSchemaBase):
    schema_version: Literal["1.6"]
    source: Literal["digest-builder"]
    agreed_to_pay_fees: bool
    amount: int
    donor_selected_amount: float
    reason_for_giving: str | None = None
    referer: pydantic.HttpUrl | None = None
    revenue_program_id: int
    revenue_program_slug: str
    sf_campaign_id: str | None = None

    @pydantic.field_validator("agreed_to_pay_fees", "marketing_consent")
    @classmethod
    def validate_booleans(cls, v: Any) -> bool | None:
        """Validate booleans.

        This validator is responsible for ensuring that the agreed_to_pay_fees and swag_opt_out fields are valid.
        """
        return cls.normalize_boolean(v)


STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS: dict[str, StripeMetadataSchemaBase] = {
    "1.0": StripePaymentMetadataSchemaV1_0,
    "1.1": StripePaymentMetadataSchemaV1_1,
    # NB: 1.2 is obsolete and was never used
    "1.3": StripePaymentMetadataSchemaV1_3,
    "1.4": StripePaymentMetadataSchemaV1_4,
    "1.5": StripePaymentMetadataSchemaV1_5,
    "1.6": StripePaymentMetadataSchemaV1_6,
}


def cast_metadata_to_stripe_payment_metadata_schema(
    metadata: dict,
) -> (
    StripePaymentMetadataSchemaV1_0
    | StripePaymentMetadataSchemaV1_1
    | StripePaymentMetadataSchemaV1_3
    | StripePaymentMetadataSchemaV1_4
    | StripePaymentMetadataSchemaV1_5
    | StripePaymentMetadataSchemaV1_6
):
    """Cast metadata to the appropriate schema based on the schema_version field."""
    if not metadata:
        raise InvalidMetadataError("Metadata is empty")
    if (schema_version := metadata.get("schema_version")) not in STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS:
        raise InvalidMetadataError(f"Unknown schema version {schema_version}")
    schema_class = STRIPE_PAYMENT_METADATA_SCHEMA_VERSIONS[schema_version]
    try:
        return schema_class(**metadata)
    except pydantic.ValidationError as exc:
        logger.debug("Metadata failed to validate against schema %s", schema_class)
        raise InvalidMetadataError(str(exc)) from exc
