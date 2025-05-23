import base64
import datetime
import json
from collections.abc import Callable
from dataclasses import asdict
from typing import Any

from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404
from django.template import Template, TemplateDoesNotExist
from django.template.base import VariableNode
from django.template.loader import get_template
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

import pydantic

from apps.contributions.models import BillingHistoryItem, Contribution
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


class FailedPaymentEmailContextData(pydantic.BaseModel):
    contribution_id: int

    @staticmethod
    def from_pubsub_message(message: dict[str, Any]) -> "FailedPaymentEmailContextData":
        return FailedPaymentEmailContextData(
            contribution_id=message["data"]["contribution_id"],
        )
    @staticmethod


class TransactionalEmailContext(pydantic.BaseModel):
    pass


class FailedPaymentEmailContext(TransactionalEmailContext):
    contribution_interval: str
    contribution_amount: str
    contribution_detail_url: str
    revenue_program_name: str
    contributor_name: str
    portal_login_url: str


class TransactionalEmail:

    @staticmethod
    def send()

    @staticmethod
    def _extract_template_variables(template_string: str) -> set[str]:
        template = Template(template_string)
        variables: set[str] = set()

        def extract_from_node(node: Any):
            if isinstance(node, VariableNode):
                # Get the variable name from the filter expression
                var_name = node.filter_expression.var.var
                if isinstance(var_name, str):
                    variables.add(var_name.split(".")[0])  # Get root variable

            # Recursively check child nodes
            for child in getattr(node, "nodelist", []):
                extract_from_node(child)

        for node in template.nodelist:
            extract_from_node(node)

        return variables

    @staticmethod
    def validate_context_provides_required_variables(template: Template, context: TransactionalEmailContext) -> None:
        template_string = template.template.source
        required_variables = TransactionalEmail._extract_template_variables(template_string)
        context_variables = set(context.model_dump().keys())
        missing_variables = required_variables - context_variables
        if missing_variables:
            raise ValueError(f"Missing variables in context: {missing_variables}")

    @staticmethod
    def validate_context(template: Template, context: TransactionalEmailContext, validators) -> None:
        TransactionalEmail.validate_context_provides_required_variables(template, context)
        for validator in validators:
            try:
                validator.validate(context)
            except pydantic.ValidationError as e:
                raise ValueError(f"Validation error for {template_name}: {e}")

    @staticmethod
    def render_template_with_context(
        template_name: str, context: TransactionalEmailContext, validators: list[Callable]
    ) -> HttpResponse:
        try:
            template = get_template(template_name)
        except TemplateDoesNotExist:
            return HttpResponse("Template does not exist.", status=404)

        # validators
        return HttpResponse(
            template.render(context.model_dump()),
            content_type=f"text/{'plain' if template_name.endswith('txt') else 'html'}",
        )


class FailedPaymentEmail(TransactionalEmail):
    def render(self, context: FailedPaymentEmailContext) -> HttpResponse:
        return self.render_template_with_context(
            "recurring-contribution-payment-updated.html",
            context,
            validators=[],
        )


class PubSubMessage(pydantic.BaseModel):
    data: str
    ack_id: str
    publish_time: str
    message_id: str
    attributes: dict[str, str]


@csrf_exempt
@require_http_methods(["POST"])
def trigger_failed_payment_email(request: HttpRequest):
    """This view is meant to be called by PubSub to trigger the failed payment email."""
    payload = PubSubMessage(**json.loads(request.body.decode("utf-8")))
    # ideally would validate the payload here
    message = json.loads(base64.b64decode(payload.data))
    contribution = get_object_or_404(Contribution, id=message["contribution_id"])
    context = FailedPaymentEmailContext(
        contribution_interval=contribution.interval_display_value,
        contribution_amount=contribution.formatted_amount,
        contribution_detail_url=contribution.get_contribution_detail_url(),
        revenue_program_name=contribution.revenue_program.name,
        contributor_name=contribution.contributor.name,
        portal_login_url=contribution.revenue_program.get_portal_login_url(),
    )
    send_templated_email(
        subject="Failed Payment",
        template_name="failed-payment-notification.html",
        context=context,
        to=[contribution.contributor.email],
    )
    return HttpResponse("OK", status=200)
