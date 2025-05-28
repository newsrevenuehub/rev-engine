import csv
import hashlib
import logging
from io import StringIO
from typing import TYPE_CHECKING

from django.conf import settings
from django.db.models import QuerySet


if TYPE_CHECKING:
    from apps.contributions.models import Contribution


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def get_hub_stripe_api_key(livemode=False):
    """Caller can force livemode with argument, otherwise use setting."""
    if livemode or settings.STRIPE_LIVE_MODE:
        return settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS
    return settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS


def format_ambiguous_currency(integer):
    return f"{integer / 100:,.2f}"


def get_sha256_hash(string):
    """Return salted hash of string."""
    string = string + settings.ENCRYPTION_SALT  # add a salt
    result = hashlib.sha256(string.encode())
    hash_str = result.hexdigest()
    return hash_str[:15]


CSV_HEADER_CONTRIBUTION_ID = "Contribution ID"
CSV_HEADER_CONTRIBUTOR = "Contributor"
CSV_HEADER_CURRENCY = "Currency"
CSV_HEADER_AMOUNT = "Amount"
CSV_HEADER_DONOR_SELECTED_AMOUNT = "Donor Selected Amount"
CSV_HEADER_AGREED_TO_PAY_FEES = "Agreed to Pay Fees"
CSV_HEADER_FREQUENCY = "Frequency"
CSV_HEADER_PAYMENT_DATE = "Payment Received Date"
CSV_HEADER_PAYMENT_STATUS = "Payment status"
CSV_HEADER_ADDRESS = "Address"
CSV_HEADER_EMAIL = "Email"
CSV_HEADER_PHONE = "Phone"
CSV_HEADER_PAGE_URL = "Page URL"
CSV_HEADER_REASON_FOR_GIVING = "Reason for Giving"
CSV_HEADER_HONOREE = "In Honor Of"
CSV_HEADER_IN_MEMORY_OF = "In Memory Of"
CONTRIBUTION_EXPORT_CSV_HEADERS = (
    CSV_HEADER_CONTRIBUTION_ID,
    CSV_HEADER_CONTRIBUTOR,
    CSV_HEADER_CURRENCY,
    CSV_HEADER_AMOUNT,
    CSV_HEADER_DONOR_SELECTED_AMOUNT,
    CSV_HEADER_AGREED_TO_PAY_FEES,
    CSV_HEADER_FREQUENCY,
    CSV_HEADER_PAYMENT_DATE,
    CSV_HEADER_PAYMENT_STATUS,
    CSV_HEADER_ADDRESS,
    CSV_HEADER_EMAIL,
    CSV_HEADER_PHONE,
    CSV_HEADER_PAGE_URL,
    CSV_HEADER_REASON_FOR_GIVING,
    CSV_HEADER_HONOREE,
    CSV_HEADER_IN_MEMORY_OF,
)


def export_contributions_to_csv(contributions: QuerySet["Contribution"]):
    data = []
    for contribution in contributions:
        contributor = contribution.contributor
        if not contributor:
            logger.warning(
                "`export_contributions_to_csv` encountered a contribution (ID %s) that does not have an associated contributor."
                " This contribution will be included in the export, but will have a missing value for the %s field.",
                contribution.id,
                CSV_HEADER_EMAIL,
            )
        metadata = contribution.contribution_metadata or {}
        data.append(
            {
                CSV_HEADER_CONTRIBUTION_ID: contribution.id,
                CSV_HEADER_CONTRIBUTOR: contribution.billing_name,
                CSV_HEADER_CURRENCY: contribution.currency.upper(),
                CSV_HEADER_AMOUNT: f"{contribution.amount / 100:.2f}",
                CSV_HEADER_DONOR_SELECTED_AMOUNT: (
                    f"{contribution.donor_selected_amount:.2f}" if contribution.donor_selected_amount else ""
                ),
                CSV_HEADER_AGREED_TO_PAY_FEES: metadata.get("agreed_to_pay_fees", ""),
                CSV_HEADER_FREQUENCY: contribution.interval,
                CSV_HEADER_PAYMENT_DATE: contribution.created,
                CSV_HEADER_PAYMENT_STATUS: contribution.status,
                CSV_HEADER_ADDRESS: contribution.billing_address,
                CSV_HEADER_EMAIL: contributor.email if contributor else None,
                CSV_HEADER_PHONE: contribution.billing_phone,
                CSV_HEADER_PAGE_URL: metadata.get("referer"),
                CSV_HEADER_REASON_FOR_GIVING: metadata.get("reason_for_giving", ""),
                CSV_HEADER_HONOREE: metadata.get("honoree", ""),
                CSV_HEADER_IN_MEMORY_OF: metadata.get("in_memory_of", ""),
            }
        )

    with StringIO() as csv_file:
        csv_writer = csv.DictWriter(csv_file, fieldnames=CONTRIBUTION_EXPORT_CSV_HEADERS)
        csv_writer.writeheader()
        csv_writer.writerows(data)
        return csv_file.getvalue()
