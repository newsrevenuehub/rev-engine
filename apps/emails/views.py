from dataclasses import asdict
from datetime import datetime

from django.http import HttpResponse
from django.template import loader

from apps.organizations.models import RevenueProgram


def preview_recurring_contribution_reminder(request):
    rp = RevenueProgram.objects.get(id=request.GET.get("rp"))
    style = asdict(rp.transactional_email_style)
    if request.GET.get("logo"):
        style.logo_url = request.GET.get("logo")
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
