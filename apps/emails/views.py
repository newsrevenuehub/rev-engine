import datetime
from dataclasses import asdict

from django.http import HttpResponse
from django.template import TemplateDoesNotExist
from django.template.loader import get_template

from apps.contributions.models import BillingHistoryItem, Contribution
from apps.emails.helpers import ContributionReceiptEmailCustomizations
from apps.organizations.models import RevenueProgram


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
        "customizations": asdict(ContributionReceiptEmailCustomizations(revenue_program=rp)),
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
