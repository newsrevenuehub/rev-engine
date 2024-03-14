import django_filters

from apps.contributions.models import Contribution, ContributionStatus


class ContributionFilter(django_filters.FilterSet):
    contributor_email = django_filters.CharFilter(field_name="contributor__email", lookup_expr="icontains")
    status = django_filters.MultipleChoiceFilter(choices=ContributionStatus.choices)
    status__not = django_filters.MultipleChoiceFilter(
        choices=ContributionStatus.choices, field_name="status", exclude=True, lookup_expr="iexact"
    )
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
            ("status__not", "status__not"),
            ("interval", "interval"),
            ("auto_accept_on", "auto_accept_on"),
            ("donation_page__revenue_program__name", "revenue_program__name"),
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


class PortalContributionFilter(django_filters.rest_framework.DjangoFilterBackend):
    # Contributors should never see contributions with these statuses, or
    # interact with them (e.g. delete or patch them).
    HIDDEN_STATUSES = [
        ContributionStatus.FLAGGED,
        ContributionStatus.PROCESSING,
        ContributionStatus.REJECTED,
    ]
    ALLOWED_FILTER_FIELDS = ["status", "revenue_program"]

    def filter_queryset(self, request, queryset):
        # Exclude hidden statuses by default
        queryset = queryset.exclude(status__in=self.HIDDEN_STATUSES)
        filters = {}
        for field in self.ALLOWED_FILTER_FIELDS:
            value = request.query_params.get(field)
            if value is not None:
                if field == "revenue_program":
                    filters["donation_page__revenue_program"] = value
                else:
                    filters[field] = value

        return queryset.filter(**filters)
