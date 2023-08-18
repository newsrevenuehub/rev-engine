import datetime
from typing import Literal

import stripe
from pydantic import BaseModel

from apps.contributions.choices import ContributionInterval, ContributionStatus


class StripePiAsPortalContribution(BaseModel):
    amount: int
    card_brand: str | None
    created: datetime.datetime
    credit_card_expiration_date: str | None
    id: str
    interval: ContributionInterval
    is_cancelable: bool
    is_modifiable: bool
    # this can be None in case of uninvoiced subscriptions (aka, legacy contributions that have been imported)
    last_payment_date: datetime.datetime | None
    last4: int | None
    payment_type: str | None
    provider_customer_id: str
    revenue_program: str
    status: ContributionStatus
    stripe_account_id: str
    subscription_id: str | None

    class Config:
        extra = "forbid"


class StripePiSearchResponse(BaseModel):
    """
    Wrapper for Stripe PaymentIntent search response as documented here:
    https://stripe.com/docs/api/pagination/search as of August 2023.


    Its expected usage is converting the attrdict like Stripe object returned by .search to a StripePiSearchResponse.

    This is desirable from a type safety perspective as it allows us to refer to be more specific than typing.Any given
    that Stripe does not provide type hints for the objects returned by .search.
    """

    url: str
    has_more: bool
    data: list[stripe.PaymentIntent]
    next_page: str | None = None
    object: Literal["search_result"] = "search_result"

    class Config:
        # we do this to enable using `stripe.PaymentIntent` in data field type hint. Without this, pydantic will
        # raise an error because it expects stripe.PaymentIntent to be JSON serializable, which it is not.
        arbitrary_types_allowed = True
