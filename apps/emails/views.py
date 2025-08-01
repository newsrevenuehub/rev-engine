import datetime
from dataclasses import asdict

from django.db import models
from django.http import Http404, HttpResponse
from django.template import TemplateDoesNotExist
from django.template.loader import get_template

from knox.auth import TokenAuthentication
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.api.permissions import IsHubAdmin, IsOrgAdmin, IsRpAdmin, IsSwitchboardAccount
from apps.contributions.models import BillingHistoryItem, Contribution
from apps.emails.models import EmailCustomization, TransactionalEmailRecord
from apps.emails.serializers import (
    EmailCustomizationSerializer,
    TriggerAnnualPaymentReminderSerializer,
)
from apps.organizations.models import RevenueProgram
from apps.users.choices import Roles


PERMITTED_TEMPLATES = tuple(
    [
        f"{name}.{ext}"
        for name in [
            "recurring-contribution-email-reminder",
            "recurring-contribution-canceled",
            "recurring-contribution-payment-updated",
            "recurring-contribution-amount-updated",
            "nrh-default-contribution-confirmation-email",
        ]
        for ext in ["html", "txt"]
    ]
)


def preview_contribution_email_template(request, template_name: str):
    if template_name not in PERMITTED_TEMPLATES:
        return HttpResponse(f"Template {template_name} not permitted.", status=400)
    rp_id = request.GET.get("rp_id", None)
    if rp_id is None:
        return HttpResponse("`rp_id` is a required field.", status=400)
    try:
        rp = RevenueProgram.objects.get(id=rp_id)
    except RevenueProgram.DoesNotExist:
        return HttpResponse("RevenueProgram does not exist.", status=404)
    rp_style = asdict(rp.transactional_email_style)
    rp_style["logo_url"] = request.GET.get("logo_url", rp_style["logo_url"])
    try:
        template = get_template(template_name)
    except TemplateDoesNotExist:
        return HttpResponse("Template does not exist.", status=404)
    data = {
        "contribution_interval_display_value": "year",
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "contribution_amount": "$123.45",
        "contributor_name": "Contributor Name",
        "copyright_year": datetime.datetime.now(datetime.timezone.utc).year,
        "contributor_email": "nobody@fundjournalism.org",
        "customizations": rp.get_contribution_receipt_email_customizations(),
        "portal_url": "https://portal-url",
        "rp_name": rp.name,
        "style": rp_style,
        "default_contribution_page_url": rp.default_donation_page.page_url if rp.default_donation_page else None,
        "show_billing_history": True,
        "billing_history": [
            BillingHistoryItem(
                payment_date=datetime.datetime.now(datetime.timezone.utc),
                payment_amount=Contribution.format_amount(2500),
                payment_status="Paid",
            ),
            BillingHistoryItem(
                payment_date=datetime.datetime.now(datetime.timezone.utc),
                payment_amount=Contribution.format_amount(1500),
                payment_status="Refunded",
            ),
        ],
    }
    return HttpResponse(
        template.render(
            data,
            request,
        ),
        content_type=f"text/{'plain' if template_name.endswith('txt') else 'html'}",
    )


class EmailCustomizationViewSet(viewsets.ModelViewSet):
    """Viewset for managing email customizations."""

    permission_classes = [IsHubAdmin | IsOrgAdmin | IsRpAdmin]
    serializer_class = EmailCustomizationSerializer
    http_method_names = ["get", "post", "patch", "delete"]
    pagination_class = None

    def get_object(self):
        """Override to always return a generic 404 message.

        We override `get_object` to prevent leaking info about existence of specific email customization
        objects. Without this, if the user tries to retrieve an unowned email customization, the API will
        return a 404 with a message like "EmailCustomization matching query does not exist.", instead of the
        generic "Not found." message we want to provide.
        """
        try:
            return super().get_object()
        except Http404 as exc:
            raise Http404("Not found.") from exc

    def get_queryset(self) -> models.QuerySet[EmailCustomization]:
        match self.request.user.roleassignment.role_type:
            case Roles.ORG_ADMIN:
                base_filter = {"revenue_program__organization": self.request.user.roleassignment.organization}
            case Roles.RP_ADMIN:
                base_filter = {
                    "revenue_program__id__in": self.request.user.roleassignment.revenue_programs.values_list(
                        "id", flat=True
                    )
                }
            case (
                Roles.HUB_ADMIN
            ):  # pragma: no cover (given permission classes, it will always be true if at this point)
                base_filter = {}
        queryset = EmailCustomization.objects.filter(**base_filter)
        if (rp_id := self.request.query_params.get("revenue_program")) and int(rp_id) not in queryset.values_list(
            "revenue_program__id", flat=True
        ):
            return queryset.none()
        return queryset


class TriggerTransactionalEmailViewSet(viewsets.GenericViewSet):
    """Viewset for triggering transactional emails."""

    permission_classes = [IsSwitchboardAccount]
    authentication_classes = [TokenAuthentication]
    http_method_names = ["post"]

    @action(detail=False, url_path="annual-payment-reminder", url_name="annual-payment-reminder")
    def trigger_annual_payment_reminder(self, request: Request) -> Response:
        serializer = TriggerAnnualPaymentReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        TransactionalEmailRecord.handle_annual_payment_reminder(**serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        url_path="failed-payment-notification",
        url_name="failed-payment-notification",
    )
    def trigger_failed_payment_notification(self, request: Request) -> Response:
        """Trigger a failed payment notification email."""
        serializer = TriggerAnnualPaymentReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        TransactionalEmailRecord.handle_failed_payment_notification(**serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)
