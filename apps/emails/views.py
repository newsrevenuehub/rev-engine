from dataclasses import asdict
from datetime import datetime

from django.http import HttpResponse
from django.template import loader

from apps.organizations.models import RevenueProgram


def preview_recurring_contribution_reminder(request):
    """
    Previews a recurring contribution reminder in the browser. Only accessible
    if DEBUG is set (see revengine/urls.py).
    """
    rp = RevenueProgram.objects.get(id=request.GET.get("rp"))
    style = asdict(rp.transactional_email_style)
    if request.GET.get("logo"):
        style["logo_url"] = request.GET.get("logo")
    template = loader.get_template("recurring-contribution-email-reminder.html")
    return HttpResponse(
        template.render(
            {
                "contribution_interval_display_value": "year",
                "contribution_date": datetime.now(),
                "contribution_amount": "$123.45",
                "copyright_year": datetime.now().year,
                "contributor_email": "nobody@fundjournalism.org",
                "magic_link": "https://magic-link",
                "rp_name": rp.name,
                "style": style,
            },
            request,
        )
    )


def preview_recurring_contribution_canceled(request):
    """
    Previews a recurring contribution cancellation notification in the browser.
    To view the plain text version, use a `text` querystring param. Only
    accessible if DEBUG is set (see revengine/urls.py).
    """
    rp = RevenueProgram.objects.get(id=request.GET.get("rp"))
    style = asdict(rp.transactional_email_style)
    if request.GET.get("logo"):
        style["logo_url"] = request.GET.get("logo")
    template = loader.get_template(f"recurring-contribution-canceled.{'txt' if request.GET.get('text') else 'html'}")
    data = {
        "contribution_interval_display_value": "year",
        "contribution_date": datetime.now(),
        "contribution_amount": "$123.45",
        "contributor_name": "Contributor Name",
        "copyright_year": datetime.now().year,
        "contributor_email": "nobody@fundjournalism.org",
        "magic_link": "https://magic-link",
        "rp_name": rp.name,
        "style": style,
    }
    if rp.default_donation_page:
        data["default_contribution_page_url"] = rp.default_donation_page.page_url
    return HttpResponse(
        template.render(
            data,
            request,
        ),
        content_type="text/plain" if request.GET.get("text") else "text/html",
    )


def preview_recurring_contribution_payment_updated(request):
    """
    Previews a recurring contribution payment method notification in the
    browser. To view the plain text version, use a `text` querystring param.
    Only accessible if DEBUG is set (see revengine/urls.py).
    """
    rp = RevenueProgram.objects.get(id=request.GET.get("rp"))
    style = asdict(rp.transactional_email_style)
    if request.GET.get("logo"):
        style["logo_url"] = request.GET.get("logo")
    template = loader.get_template(
        f"recurring-contribution-payment-updated.{'txt' if request.GET.get('text') else 'html'}"
    )
    return HttpResponse(
        template.render(
            {
                "contribution_interval_display_value": "year",
                "contribution_date": datetime.now(),
                "contribution_amount": "$123.45",
                "contributor_name": "Contributor Name",
                "copyright_year": datetime.now().year,
                "contributor_email": "nobody@fundjournalism.org",
                "magic_link": "https://magic-link",
                "rp_name": rp.name,
                "style": style,
            },
            request,
        ),
        content_type="text/plain" if request.GET.get("text") else "text/html",
    )


def preview_contribution_confirmation(request):
    """
    Previews a contribution confirmation in the browser. Only accessible if
    DEBUG is set (see revengine/urls.py).
    """
    rp = RevenueProgram.objects.get(id=request.GET.get("rp"))
    style = asdict(rp.transactional_email_style)
    if request.GET.get("logo"):
        style["logo_url"] = request.GET.get("logo")
    template = loader.get_template("nrh-default-contribution-confirmation-email.html")
    return HttpResponse(
        template.render(
            {
                "contribution_interval_display_value": "year",
                "contribution_date": datetime.now(),
                "contribution_amount": "$123.45",
                "contributor_name": "Contributor Name",
                "copyright_year": datetime.now().year,
                "contributor_email": "nobody@fundjournalism.org",
                "magic_link": "https://magic-link",
                "rp_name": rp.name,
                "style": style,
            },
            request,
        )
    )
