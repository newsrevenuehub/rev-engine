import django_filters

from apps.pages.models import Style


class StyleFilter(django_filters.FilterSet):
    revenue_program = django_filters.NumberFilter(field_name="revenue_program__id")

    class Meta:
        model = Style
        fields = ["revenue_program"]
