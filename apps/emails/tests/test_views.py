from django.template import TemplateDoesNotExist

import pytest
from rest_framework.test import APIRequestFactory

from apps.organizations.tests.factories import RevenueProgramFactory

from ..views import preview_contribution_email_template


@pytest.mark.django_db
class TestPreviewContributionEmailHappyPath:
    @pytest.mark.parametrize(
        "template_name",
        [
            "recurring-contribution-email-reminder.html",
            "recurring-contribution-email-reminder.txt",
            "recurring-contribution-canceled.html",
            "recurring-contribution-canceled.txt",
            "recurring-contribution-payment-updated.html",
            "recurring-contribution-payment-updated.txt",
            "nrh-default-contribution-confirmation-email.html",
            "nrh-default-contribution-confirmation-email.txt",
        ],
    )
    @pytest.mark.parametrize("logo_url", ["truthy", None])
    def test_responds_200(self, template_name, logo_url):
        rp = RevenueProgramFactory()
        query = f"/?rp_id={rp.id}"
        if logo_url:
            query += f"&logo_url={logo_url}"
        assert (
            preview_contribution_email_template(APIRequestFactory().get(query), template_name=template_name).status_code
            == 200
        )


@pytest.mark.django_db
class TestPreviewContributionEmailUnhappyPath:
    def test_responds_400_when_nonpermitted_template(self):
        rp = RevenueProgramFactory()
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(f"/?rp_id={rp.id}"), template_name="bad"
            ).status_code
            == 400
        )

    def test_responds_404_when_template_not_found(self, mocker):
        mocker.patch("apps.emails.views.get_template", side_effect=TemplateDoesNotExist(""))
        rp = RevenueProgramFactory()
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(f"/?rp_id={rp.id}"), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 404
        )

    def test_responds_400_when_rp_id_omitted(self):
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(""), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 400
        )

    def test_responds_404_when_rp_doesnt_exist(self):
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get("/?rp_id=1"), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 404
        )
