import django_filters

from apps.contributions.models import Contribution


class ContributionFilter(django_filters.FilterSet):
    contributor_email = django_filters.CharFilter(field_name="contributor__email", lookup_expr="icontains")

    class Meta:
        model = Contribution
        fields = {
            "id": ["exact"],
            "amount": ["exact", "lt", "gt", "lte", "gte"],
            "currency": ["iexact"],
            "created": ["lt", "gt", "lte", "gte"],
            "modified": ["lt", "gt", "lte", "gte"],
            "last_payment_date": ["lt", "gt", "lte", "gte"],
            "payment_provider_used": ["iexact"],
            "bad_actor_score": ["exact", "lt", "gt", "lte", "gte"],
            "flagged_date": ["lt", "gt", "lte", "gte"],
            "status": ["iexact"],
        }
