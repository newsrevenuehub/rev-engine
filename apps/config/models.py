from django.contrib.postgres.fields import CICharField
from django.db import models
from django.utils.translation import gettext_lazy as _

from waffle.models import CACHE_EMPTY, AbstractUserFlag
from waffle.utils import get_cache, get_setting, keyfmt


class DenyListWord(models.Model):
    word = CICharField(max_length=255, unique=True)  # CI == Case Insensitive

    class Meta:
        verbose_name = "Deny-list word"
        verbose_name_plural = "Deny-list words"

    def __str__(self):
        return self.word


class Flag(AbstractUserFlag):
    FLAG_ORGANIZATIONS_CACHE_KEY = "FLAG_ORGANIZATIONS_CACHE_KEY"
    FLAG_ORGANIZATIONS_CACHE_KEY_DEFAULT = "flag:%s:organizations"

    organizations = models.ManyToManyField(
        "organizations.Organization",
        blank=True,
        help_text=_("Activate this flag for these organizations."),
    )

    def get_flush_keys(self, flush_keys=None):
        flush_keys = super(Flag, self).get_flush_keys(flush_keys)
        organizations_cache_key = get_setting(
            Flag.FLAG_ORGANIZATIONS_CACHE_KEY, Flag.FLAG_ORGANIZATIONS_CACHE_KEY_DEFAULT
        )
        flush_keys.append(keyfmt(organizations_cache_key, self.name))
        return flush_keys

    def is_active_for_org(self, org):
        org_ids = self._get_organization_ids()
        if org.pk in org_ids:
            return True

    def _get_organization_ids(self):
        cache = get_cache()
        cache_key = keyfmt(
            get_setting(Flag.FLAG_ORGANIZATIONS_CACHE_KEY, Flag.FLAG_ORGANIZATIONS_CACHE_KEY_DEFAULT), self.name
        )
        cached = cache.get(cache_key)
        if cached == CACHE_EMPTY:
            return set()
        if cached:
            return cached

        org_ids = set(self.organizations.all().values_list("pk", flat=True))
        if not org_ids:
            cache.add(cache_key, CACHE_EMPTY)
            return set()

        cache.add(cache_key, org_ids)
        return org_ids
