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


def get_org_and_rp_from_request(request):
    return (request.GET.get(settings.ORG_SLUG_PARAM), request.GET.get(settings.RP_SLUG_PARAM))
