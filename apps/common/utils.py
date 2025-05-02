import logging
import os
import re

from django.conf import settings
from django.db.models import Model
from django.utils.text import slugify

import CloudFlare
import requests
import reversion
import stripe


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")

CREATED = "created"
UPDATED = "updated"
LEFT_UNCHANGED = "left unchanged"


def hide_sentry_environment(ticket_id: str):
    """Hides a Sentry environment for a ticket.

    Requires SENTRY_ORGANIZARTION_SLUG, SENTRY_PROJECT_SLUG, and SENTRY_AUTH_TOKEN
    environment variables, but if they're not present, doesn't raise an
    exception.
    """
    org_slug = os.getenv("SENTRY_ORGANIZATION_SLUG")
    project_slug = os.getenv("SENTRY_PROJECT_SLUG")
    auth_token = os.getenv("SENTRY_AUTH_TOKEN")
    if not org_slug or not project_slug or not auth_token:
        logger.warning(
            "SENTRY_ORGANIZATION_SLUG, SENTRY_PROJECT_SLUG, or SENTRY_API_KEY unset; skipping Sentry environment cleanup"
        )
        return
    env_name = ticket_id.lower()
    headers = {"Authorization": f"Bearer {auth_token}"}
    hide_request = requests.put(
        f"https://sentry.io/api/0/projects/{org_slug}/{project_slug}/environments/{env_name}/",
        headers=headers,
        json={"isHidden": True},
        timeout=5,
    )
    if hide_request.status_code != 200:
        logger.error("Failed to hide Sentry environment %s: %s", env_name, hide_request)
    else:
        logger.info("Successfully hid Sentry environment %s", env_name)


def delete_stripe_webhook(webhook_url, api_key):
    webhooks = stripe.WebhookEndpoint.list(limit=20, api_key=api_key)
    urls = {x["url"]: x["id"] for x in webhooks["data"]}
    if webhook_url in urls:
        webhook_id = urls[webhook_url]
        stripe.WebhookEndpoint.delete(webhook_id, api_key=api_key)


def create_stripe_webhook(webhook_url, api_key, enabled_events):
    webhooks = stripe.WebhookEndpoint.list(api_key=api_key)
    urls = [x["url"] for x in webhooks["data"]]
    if webhook_url in urls:
        logger.info("Webhook already exists: %s", webhook_url)
        return None

    response = stripe.WebhookEndpoint.create(
        url=webhook_url,
        enabled_events=enabled_events,
        connect=True,
        api_key=api_key,
        api_version=settings.STRIPE_API_VERSION,
    )
    if response:
        return response["secret"]


def delete_cloudflare_cnames(ticket_id, per_page=300):
    cloudflare_conn = CloudFlare.CloudFlare(raw=True)
    zone_id = cloudflare_conn.zones.get(params={"name": settings.CF_ZONE_NAME})["result"][0]["id"]
    current_page = 0
    while True:
        current_page += 1
        raw_zone_dns_records = cloudflare_conn.zones.dns_records.get(
            zone_id, params={"per_page": per_page, "page": current_page}
        )
        zone_dns_records = raw_zone_dns_records["result"]
        cloudflare_domains = {x["name"]: x["content"] for x in zone_dns_records}
        cloudflare_record_ids = {x["name"]: x["id"] for x in zone_dns_records}
        for domain in cloudflare_domains:
            record_id = cloudflare_record_ids[domain]
            try:
                if ticket_id.lower() in domain.lower():
                    logger.info("Deleting DNS entry for: %s", domain)
                    cloudflare_conn.zones.dns_records.delete(zone_id, record_id)
            except CloudFlare.exceptions.CloudFlareAPIError:
                logger.warning('CloudFlare API error when trying to delete the domain "%s"', domain, exc_info=True)

        total_count = raw_zone_dns_records["result_info"]["total_count"]
        if (current_page * per_page) >= total_count:
            break


def upsert_cloudflare_cnames(slugs: list = None, per_page=300):
    # takes a list instead of a single entry so it can do one call to fetch them all
    cloudflare_conn = CloudFlare.CloudFlare(raw=True)
    zone_id = cloudflare_conn.zones.get(params={"name": settings.CF_ZONE_NAME})["result"][0]["id"]
    current_page = 0
    zone_dns_records = []
    # fetch all the records from all pages and store them in "zone_dns_records" before creating/updating DNS
    while True:
        current_page += 1
        # fetch this so we don't try adding entries that are already there
        raw_zone_dns_records = cloudflare_conn.zones.dns_records.get(
            zone_id, params={"per_page": per_page, "page": current_page}
        )
        zone_dns_records += raw_zone_dns_records["result"]

        total_count = raw_zone_dns_records["result_info"]["total_count"]
        if (current_page * per_page) >= total_count:
            break

    cloudflare_domains = {x["name"]: x["content"] for x in zone_dns_records}
    cloudflare_record_ids = {x["name"]: x["id"] for x in zone_dns_records}

    for slug in slugs:
        fqdn = f"{slug}.{settings.CF_ZONE_NAME}"
        content = f"{settings.HEROKU_APP_NAME}.herokuapp.com"
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
            # NB: adding `str(error)` because this function gets run in bootstrap-review-app management command
            # which when run doesn't lead to logs appearing in Sentry
            logger.warning("Something went wrong with Cloudflare %s", str(error), exc_info=error)


def extract_ticket_id_from_branch_name(branch_name: str) -> str | None:
    """Extract ticket id from branch name."""
    logger.info("Extracting ticket id from branch name: %s", branch_name)
    match = re.match(r"^[a-zA-Z]*-[0-9]*", branch_name)
    if not match:
        logger.warning("Could not extract ticket id from branch name: %s", branch_name)
    return match.group().lower() if match else None


def normalize_slug(name="", slug="", max_length=50) -> str:
    """Return a lowercase string of length less than or equal to the max_length.

    :param name: str:  a character string that can be slugified.
    :param slug: str:  a slug value.
    :param max_length: int: maximum length of slug.
    """
    slug = slugify(slug, allow_unicode=True)
    if not slug:
        slug = slugify(name, allow_unicode=True)

    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug


def cleanup_keys(data_dict, unwanted_keys):
    return {k: v for k, v in data_dict.items() if k not in unwanted_keys}


def get_subdomain_from_request(request) -> str | None:
    """Return the subdomain from a request, mapping the hostname using settings.HOST_MAP if present."""
    subdomain = None
    host = request.get_host()

    # Try to map it using the HOST_MAP environment variable.

    if host in settings.HOST_MAP:
        return settings.HOST_MAP[host]

    # Parse it normally.
    split_host = host.split(".")
    if len(split_host) > 2 and split_host[0] not in settings.DASHBOARD_SUBDOMAINS:
        subdomain = split_host[0]
    return subdomain


def get_original_ip_from_request(request):
    # prefer CF-Connecting-IP, then X-Forwarded-For, then REMOTE_ADDR
    if cf_connecting_ip := request.headers.get("CF-Connecting-IP"):
        logger.debug("Using CF-Connecting-IP as request IP: %s", cf_connecting_ip)
        return cf_connecting_ip
    if x_forwarded_for := request.headers.get("X-Forwarded-For"):
        logger.debug("Using X-Forwarded-For as request IP: %s", x_forwarded_for)
        return x_forwarded_for.split(",")[0]

    remote_addr = request.META.get("REMOTE_ADDR")
    logger.debug("Using REMOTE_ADDR as request IP: %s", remote_addr)
    return remote_addr


def google_cloud_pub_sub_is_configured() -> bool:
    return all([settings.ENABLE_PUBSUB and settings.GOOGLE_CLOUD_PROJECT])


def booleanize_string(value: str) -> bool:
    """Return whether a string value is considered affirmative/positive.

    This is different from "truthy", strictly speaking, because the string
    "false" is considered truthy by Python.
    """
    return value.lower().strip() in ["y", "yes", "true"]


def upsert_with_diff_check(
    model,
    defaults: dict,
    unique_identifier: dict,
    caller_name: str,
    dont_update: list[str] = None,
) -> tuple[Model, str]:
    """Upsert a model instance with a reversion comment, but only update if defaults differ from existing instance.

    Fields in the dont_update list will only be used if a new object needs to be created. They will not update an existing object.

    Returns instance, whether it was created, and whether it was updated
    """
    if dont_update is None:
        dont_update = []
    with reversion.create_revision():
        instance, created = model.objects.get_or_create(defaults=defaults, **unique_identifier)
        fields_to_update = set()
        if created:
            reversion.set_comment(f"{caller_name} created {model.__name__}")
        else:
            for field, value in defaults.items():
                if (field not in dont_update) and getattr(instance, field) != value:
                    setattr(instance, field, value)
                    fields_to_update.add(field)
            if fields_to_update:
                instance.save(update_fields=fields_to_update.union({"modified"}))
                reversion.set_comment(f"{caller_name} updated {model.__name__}")

        return instance, CREATED if created else UPDATED if bool(fields_to_update) else LEFT_UNCHANGED


def get_stripe_accounts_and_their_connection_status(account_ids: list[str]) -> dict[str, bool]:
    """Given a list of stripe accounts.

    Return a dict with the account id as key and a boolean indicating if the account is connected and retrievable.
    """
    logger.info("Retrieving stripe accounts and their connection status")
    accounts = {}
    for account_id in account_ids:
        logger.info("Retrieving account %s", account_id)
        try:
            stripe.Account.retrieve(account_id)
            accounts[account_id] = True
        # if the account is not connected to the platform, we get a PermissionError
        except stripe.error.PermissionError:
            logger.warning(
                "Permission error while retrieving account %s. This is likely because the account is not connected to the platform",
                account_id,
                exc_info=True,
            )
            accounts[account_id] = False
        except stripe.error.StripeError:
            logger.exception("Error while retrieving account %s", account_id)
            accounts[account_id] = False
    return accounts
