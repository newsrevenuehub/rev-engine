from datetime import datetime

from django.http import HttpResponse
from django.template import loader


def preview_vanilla_recurring_contribution_reminder(request):
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
                "rp_name": "Revenue Program Name",
            },
            request,
        )
    )


def preview_styled_recurring_contribution_reminder(request):
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
                "rp_name": "Revenue Program Name",
                "style": {"header_color": "#00ff00", "logo_url": "https://place-hold.it/1200x50"},
            },
            request,
        )
    )
