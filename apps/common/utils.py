import logging
import re

from django.conf import settings
from django.utils.text import slugify

import CloudFlare
import stripe


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def delete_stripe_webhook(webhook_url, api_key):
    webhooks = stripe.WebhookEndpoint.list(limit=20)
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


def delete_cloudflare_cnames(ticket_id):
    cloudflare_conn = CloudFlare.CloudFlare()
    zone_id = cloudflare_conn.zones.get(params={"name": settings.CF_ZONE_NAME})[0]["id"]
    zone_dns_records = cloudflare_conn.zones.dns_records.get(zone_id, params={"per_page": 300})
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


def upsert_cloudflare_cnames(slugs: list = None):
    # takes a list instead of a single entry so it can do one call to fetch them all
    cloudflare_conn = CloudFlare.CloudFlare()
    zone_id = cloudflare_conn.zones.get(params={"name": settings.CF_ZONE_NAME})[0]["id"]
    # fetch this so we don't try adding entries that are already there
    # TODO: if this reaches over 300 we'll need to paginate
    zone_dns_records = cloudflare_conn.zones.dns_records.get(zone_id, params={"per_page": 300})
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
            logger.warning("Something went wrong with Cloudflare", exc_info=error)


def extract_ticket_id_from_branch_name(branch_name):
    """
    Extracts the ticket id from the branch name.
    """
    return re.match(r"^[a-zA-Z]*-[0-9]*", branch_name).group().lower()


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
    if len(split_host) > 2 and not split_host[0] in settings.DASHBOARD_SUBDOMAINS:
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


# class AttrDict(dict):
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.__dict__ = self

#     @classmethod
#     def construct_from_dict(cls, data):
#         if isinstance(data, dict):
#             return cls({key: cls.construct_from_dict(data[key]) for key in data})
#         if isinstance(data, list):
#             return [cls.construct_from_dict(i) for i in data]
#        return data
