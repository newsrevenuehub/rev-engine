from django.db.models import Q

import django_filters

from apps.contributions.choices import ContributionInterval
from apps.contributions.models import Contribution, ContributionStatus


class ContributionFilter(django_filters.FilterSet):
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
            ("first_payment_date", "first_payment_date"),
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
    ALLOWED_FILTER_FIELDS = ["status", "revenue_program"]
    RECURRING = "recurring"

    def filter_queryset_by_rp(self, queryset, revenue_program_id: str):
        return queryset.filter(
            Q(donation_page__revenue_program__id=revenue_program_id)
            | Q(_revenue_program__id=revenue_program_id)
            | Q(contribution_metadata__contains={"revenue_program_id": revenue_program_id})
        )

    def filter_intervals(self, queryset, request):
        match request.query_params.get("interval"):
            case ContributionInterval.ONE_TIME.value:
                return queryset.filter(interval=ContributionInterval.ONE_TIME)
            case self.RECURRING:
                return queryset.exclude(interval=ContributionInterval.ONE_TIME)
            case _:
                return queryset

    def filter_queryset(self, request, queryset):
        filters = {}
        for field in [x for x in self.ALLOWED_FILTER_FIELDS if x != "revenue_program"]:
            value = request.query_params.get(field, None)
            if value is not None:
                filters[field] = value
        qs = queryset.filter(**filters)
        qs = self.filter_intervals(qs, request)
        if (value := request.query_params.get("revenue_program", None)) is not None:
            qs = self.filter_queryset_by_rp(qs, value)
        return qs
