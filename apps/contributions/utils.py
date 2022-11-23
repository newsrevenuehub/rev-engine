import csv
import hashlib
from io import StringIO

from django.conf import settings


def get_hub_stripe_api_key(livemode=False):
    """
    Caller can force livemode with argument, otherwise use setting.
    """
    if livemode or settings.STRIPE_LIVE_MODE:
        return settings.STRIPE_LIVE_SECRET_KEY
    return settings.STRIPE_TEST_SECRET_KEY


def format_ambiguous_currency(integer):
    return f"{integer / 100:,.2f}"


def get_sha256_hash(string):
    """Return salted hash of string."""
    string = string + settings.ENCRYPTION_SALT  # add a salt
    result = hashlib.sha256(string.encode())
    hash_str = result.hexdigest()
    return hash_str[:15]


def export_contributions_to_csv(contributions):
    columns = (
        "Contributor",
        "Amount",
        "Donor Selected Amount",
        "Agreed to Pay Fees",
        "Frequency",
        "Payment Received Date",
        "Payment status",
        "Address",
        "Email",
        "Phone",
        "Page URL",
    )
    address_keys = ("line1", "line2", "city", "postal_code", "state", "country")
    data = []
    for contribution in contributions:
        payment_provider_data = contribution.payment_provider_data or {}
        charge_details = (
            payment_provider_data.get("data", {}).get("object", {}).get("charges", {}).get("data") or [{}]
        )[0]
        metadata = payment_provider_data.get("data", {}).get("object", {}).get("metadata", {})
        billing_details = charge_details.get("billing_details", {})
        billing_address = billing_details.get("address") or {}

        formatted_donor_selected_amount = ""
        if metadata.get("donor_selected_amount"):
            formatted_donor_selected_amount = f"{metadata.get('donor_selected_amount')} {contribution.currency.upper()}"

        data.append(
            {
                "Contributor": billing_details.get("name") or "Unknown",
                "Amount": contribution.formatted_amount,
                "Donor Selected Amount": formatted_donor_selected_amount,
                "Agreed to Pay Fees": metadata.get("agreed_to_pay_fees"),
                "Frequency": contribution.interval,
                "Payment Received Date": contribution.created,
                "Payment status": contribution.status,
                "Address": ", ".join(
                    [
                        billing_address.get(address_key)
                        for address_key in address_keys
                        if billing_address.get(address_key)
                    ]
                ),
                "Email": billing_details.get("email"),
                "Phone": billing_details.get("phone"),
                "Page URL": metadata.get("referer"),
            }
        )

    with StringIO() as csv_file:
        csv_writer = csv.DictWriter(csv_file, quoting=csv.QUOTE_ALL, fieldnames=columns)
        csv_writer.writeheader()
        csv_writer.writerows(data)
        return csv_file.getvalue()
