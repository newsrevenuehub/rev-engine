import logging
import os
import re

from django.conf import settings
from django.utils.text import slugify

import CloudFlare
import stripe


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def create_stripe_webhook(webhook_url, api_key):
    response = stripe.WebhookEndpoint.create(
        url=webhook_url,
        enabled_events=settings.STRIPE_WEBHOOK_EVENTS,
        connect=True,
        api_key=api_key,
        api_version=settings.STRIPE_API_VERSION,
    )
    return response.secret


def upsert_cloudflare_cnames(slugs: list = None):
    # takes a list instead of a single entry so it can do one call to fetch them all
    heroku_app_name = os.environ.get("HEROKU_APP_NAME")
    zone_name = os.environ.get("CF_ZONE_NAME")
    cloudflare_conn = CloudFlare.CloudFlare()
    zone_id = cloudflare_conn.zones.get(params={"name": zone_name})[0]["id"]
    # fetch this so we don't try adding entries that are already there
    # TODO: if this reaches over 300 we'll need to paginate
    zone_dns_records = cloudflare_conn.zones.dns_records.get(zone_id, params={"per_page": 300})
    cloudflare_domains = {x["name"]: x["content"] for x in zone_dns_records}
    cloudflare_record_ids = {x["name"]: x["id"] for x in zone_dns_records}

    for slug in slugs:
        fqdn = f"{slug}.{zone_name}"
        content = f"{heroku_app_name}.herokuapp.com"
        dns_record = {"name": f"{slug}", "type": "CNAME", "content": content, "proxied": True}
        try:
            if fqdn not in cloudflare_domains:
                logger.info("Creating DNS entry for %s → %s", fqdn, content)
                cloudflare_conn.zones.dns_records.post(zone_id, data=dns_record)
            elif cloudflare_domains[fqdn] != content:
                logger.info("Updating DNS entry for %s → %s", fqdn, content)
                record_id = cloudflare_record_ids[fqdn]
                cloudflare_conn.zones.dns_records.patch(zone_id, record_id, data=dns_record)
        except CloudFlare.exceptions.CloudFlareAPIError as error:
            logger.warning(error)


def extract_ticket_id_from_branch_name(branch_name):
    """
    Extracts the ticket id from the branch name.
    """
    return re.match(r"^[a-zA-Z]*-[0-9]*", branch_name).group()


def normalize_slug(name="", slug="", max_length=50):
    """Returns a string of length less than or equal to the max_length.
    :param name: str:  a character string that can be slugified.
    :param slug: str:  a slug value.
    :param max_length: int: maximum length of slug.
    :return: str
    """
    slug = slugify(slug, allow_unicode=True)
    if not slug:
        slug = slugify(name, allow_unicode=True)

    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug


def cleanup_keys(data_dict, unwanted_keys):
    return {k: v for k, v in data_dict.items() if k not in unwanted_keys}


def get_subdomain_from_request(request):
    subdomain = None
    host = request.get_host()
    split_host = host.split(".")
    if len(split_host) > 2 and not split_host[0] in settings.NON_DONATION_PAGE_SUBDOMAINS:
        subdomain = split_host[0]
    return subdomain


def get_changes_from_prev_history_obj(obj):
    """
    Return the changes for a particular historical record object.

    :param obj: an instance of a historical record, for example, a HistoricalOrganization.
                The HistoricalOrganization database table was added when the Organization
                model added a 'history' field that points to simple_history.models.HistoricalRecords.
    """
    changes_list = []
    if obj.prev_record:
        delta = obj.diff_against(obj.prev_record)

        for change in delta.changes:
            field = obj._meta.get_field(change.field)
            field_verbose_name = field.verbose_name
            # Write the changed data to changes_list. If the field is a JSONField,
            # then just write the field name to changes_list, since the data
            # will be very long.
            if field.get_internal_type() in ["JSONField"]:
                changes_list.append(f"'{field_verbose_name}' changed")
            else:
                changes_list.append(f"'{field_verbose_name}' changed from '{change.old}' to '{change.new}'")
    return changes_list
