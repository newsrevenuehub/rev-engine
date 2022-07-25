import logging

from django.conf import settings

from rest_framework import status

from apps.organizations.models import RevenueProgram
from apps.pages.serializers import DonationPageFullDetailSerializer


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageDetailError(Exception):
    def __init__(self, message, *args, status=status.HTTP_404_NOT_FOUND, **kwargs):
        super().__init__(*args, **kwargs)
        self.message = message
        self.status = status


class PageFullDetailHelper:
    revenue_program = None
    donation_page = None

    def __init__(self, request, live=False):
        self.request = request
        try:
            self.revenue_program_slug = request.GET["revenue_program"]
            self.page_slug = request.GET.get("page")
        except KeyError:
            raise PageDetailError("Missing required parameter", status=status.HTTP_400_BAD_REQUEST)
        self.live = live
        self._set_revenue_program()
        self._set_donation_page()
        self._validate_page_request()

    def get_donation_page_data(self):
        """Serializer donation page and return JSON."""
        page_serializer = DonationPageFullDetailSerializer(instance=self.donation_page, context={"live": self.live})
        return page_serializer.data

    def _set_revenue_program(self):
        """
        Try to get a revenue program from the provided slug
        """
        try:
            self.revenue_program = RevenueProgram.objects.get(slug=self.revenue_program_slug)
        except RevenueProgram.DoesNotExist:
            logger.info('Request for page with non-existent RevenueProgram by slug "%s"', self.revenue_program_slug)
            raise PageDetailError("Could not find revenue program matching those parameters")

    def _set_donation_page(self):
        """
        Try to get a donation page from either the revenue_program default, or the provided page slug
        """
        self.donation_page = (
            self.revenue_program.donationpage_set.filter(slug=self.page_slug).first()
            if self.page_slug
            else self.revenue_program.default_donation_page
        )
        if not self.donation_page:
            if self.page_slug:
                logger.info('Request for non-existent page by slug "%s"', self.page_slug)
            else:
                logger.info(
                    'Request for default donation page, but no default page set for revenue program "%s"',
                    self.revenue_program.name,
                )
            raise PageDetailError("Could not find page matching those parameters")

    def _validate_page_request(self):
        """
        Once we have a donation page, we must ensure that:
          - If page is requested live, the donation page IS published
          - If the page is requested live, the Organization has a verified payment provider
        """
        if not self.live:
            return

        if not self.donation_page.is_live:
            logger.info('Request for un-published page "%s"', self.donation_page)
            raise PageDetailError("This page has not been published")
        if not self.revenue_program.payment_provider.is_verified_with_default_provider():
            logger.info(
                'Request made for live page "%s", but "%s" does is not verified with its default payment provider',
                self.donation_page,
                self.donation_page.organization.name,
            )
            raise PageDetailError("RevenueProgram does not have a fully verified payment provider")
