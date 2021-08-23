import django_filters

from apps.contributions.models import Contribution, ContributionStatus


class ContributionFilter(django_filters.FilterSet):
    contributor_email = django_filters.CharFilter(field_name="contributor__email", lookup_expr="icontains")
    status = django_filters.MultipleChoiceFilter(choices=ContributionStatus.choices)
    amount = django_filters.RangeFilter()
    created = django_filters.DateTimeFromToRangeFilter()

    order_by_field = "ordering"
    ordering = django_filters.OrderingFilter(
        fields=(
            # field name, alias
            # we do this because want to use `contributor_email` without double-
            # underscore consistently for both ordering by and filtering.
            ("id", "id"),
            ("amount", "amount"),
            ("created", "created"),
            ("modified", "modified"),
            ("last_payment_date", "last_payment_date"),
            ("flagged_date", "flagged_date"),
            ("contributor__email", "contributor_email"),
            ("status", "status"),
            ("interval", "interval"),
            ("auto_accept_on", "auto_accept_on"),
        )
    )

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
