import logging

from django.conf import settings

from rest_framework import status

from apps.organizations.models import RevenueProgram
from apps.pages.serializers import DonationPageFullDetailSerializer


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class PageDetailError(Exception):
    def __init__(self, *args, message="", status=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.message = message
        self.status = status


class PageFullDetailHelper:
    revenue_program = None
    donation_page = None

    def __init__(self, request, live=False):
        try:
            self.request = request
            self.revenue_program_slug = request.GET["revenue_program"]
            self.page_slug = request.GET.get("page")
            self.live = live
        except KeyError:
            raise PageDetailError(message="Missing required parameter", status=status.HTTP_400_BAD_REQUEST)

    def set_revenue_program(self):
        """
        Try to get a revenue program from the provided slug
        """
        try:
            self.revenue_program = RevenueProgram.objects.get(slug=self.revenue_program_slug)
        except RevenueProgram.DoesNotExist:
            logger.info('Request for page with non-existent RevenueProgram by slug "%s"', self.revenue_program_slug)
            raise PageDetailError(
                message="Could not find revenue program matching those parameters", status=status.HTTP_404_NOT_FOUND
            )

    def set_donation_page(self):
        """
        Try to get a donation page from either the revenue_program detault, or the provided page slug
        """
        self._ensure_revenue_program()
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
            raise PageDetailError(
                message="Could not find page matching those parameters", status=status.HTTP_404_NOT_FOUND
            )

    def validate_page_request(self):
        self._ensure_donation_page()
        if self.live:
            self._validate_live_page_request()

    def _validate_live_page_request(self):
        """
        Once we have a donation page, we must ensure that:
          - If page is requested live, the donation page IS published
          - If the page is requested live, the Organization has a verified payment provider
        """
        if not self.donation_page.is_live:
            logger.info('Request for un-published page "%s"', self.donation_page)
            raise PageDetailError(message="This page has not been published", status=status.HTTP_404_NOT_FOUND)

        if not self.revenue_program.payment_provider.is_verified_with_default_provider():
            logger.info(
                'Request made for live page "%s", but "%s" does is not verified with its default payment provider',
                self.donation_page,
                self.donation_page.organization.name,
            )
            raise PageDetailError(
                message="RevenueProgram does not have a fully verified payment provider",
                status=status.HTTP_404_NOT_FOUND,
            )

    def get_donation_page_data(
        self,
    ):
        """
        Serializer donation page and return JSON
        """
        self._ensure_donation_page()
        page_serializer = DonationPageFullDetailSerializer(instance=self.donation_page, context={"live": self.live})
        return page_serializer.data

    def _ensure_revenue_program(self):
        """
        Raise exception if a method is called before self.revenue_program is set.
        """
        if not self.revenue_program:
            raise ValueError("You must call set_revenue_program or set self.revenue_program first")

    def _ensure_donation_page(self):
        """
        Raise exception if a method is called before self.donation_page is set.
        """
        if not self.donation_page:
            raise ValueError("You must call set_donation_page or set self.donation_page first")
