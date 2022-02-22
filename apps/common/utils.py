import operator
from functools import reduce

from django.conf import settings
from django.utils.text import slugify


def reduce_queryset_with_filters(queryset, filters):
    """
    Given a queryset and a list of Q objects, return a that queryset
    filtered by those Qs, joined with AND.
    """
    if not filters:
        return queryset
    return queryset.filter(reduce(operator.and_, filters))


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
