# models.py
from waffle.models import CACHE_EMPTY, AbstractUserFlag
from waffle.utils import get_cache, get_setting, keyfmt


class Flag(AbstractUserFlag):
    FLAG_COMPANIES_CACHE_KEY = "FLAG_COMPANIES_CACHE_KEY"
    FLAG_COMPANIES_CACHE_KEY_DEFAULT = "flag:%s:companies"

    # companies = models.ManyToManyField(
    #     Company,
    #     blank=True,
    #     help_text=_('Activate this flag for these companies.'),
    # )

    def get_flush_keys(self, flush_keys=None):
        flush_keys = super(Flag, self).get_flush_keys(flush_keys)
        companies_cache_key = get_setting(Flag.FLAG_COMPANIES_CACHE_KEY, Flag.FLAG_COMPANIES_CACHE_KEY_DEFAULT)
        flush_keys.append(keyfmt(companies_cache_key, self.name))
        return flush_keys

    def is_active_for_user(self, user):
        is_active = super(Flag, self).is_active_for_user(user)
        if is_active:
            return is_active

        if getattr(user, "company_id", None):
            company_ids = self._get_company_ids()
            if user.company_id in company_ids:
                return True

    def _get_company_ids(self):
        cache = get_cache()
        cache_key = keyfmt(get_setting(Flag.FLAG_COMPANIES_CACHE_KEY, Flag.FLAG_COMPANIES_CACHE_KEY_DEFAULT), self.name)
        cached = cache.get(cache_key)
        if cached == CACHE_EMPTY:
            return set()
        if cached:
            return cached

        company_ids = set(self.companies.all().values_list("pk", flat=True))
        if not company_ids:
            cache.add(cache_key, CACHE_EMPTY)
            return set()

        cache.add(cache_key, company_ids)
        return company_ids
