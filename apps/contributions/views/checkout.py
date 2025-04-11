"""Contains views related to the checkout process for contributions on revengine pages."""

import logging

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from stripe.error import StripeError

from apps.contributions import serializers
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionStatus,
    ContributionStatusError,
)


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@method_decorator(csrf_protect, name="dispatch")
class PaymentViewset(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Viewset for creating and deleting contributions.

    Note that the name of this class `PaymentViewset` is a misnomer, as this viewet results in creation
    and mutation of `Contribution` objects, not `Payment` objects.  This class was named before
    we had a Payment model in revengine.
    """

    permission_classes = []
    lookup_field = "uuid"
    queryset = Contribution.objects.all()

    def get_serializer_class(self):
        try:
            interval = self.request.data["interval"]
        except KeyError as err:
            raise ValidationError({"interval": "The interval field is required"}) from err
        if interval == ContributionInterval.ONE_TIME:
            return serializers.CreateOneTimePaymentSerializer
        if interval in (ContributionInterval.MONTHLY.value, ContributionInterval.YEARLY.value):
            return serializers.CreateRecurringPaymentSerializer
        raise ValidationError({"interval": "The provided value for interval is not permitted"})

    def get_serializer_context(self):
        # we need request in context for create in order to supply
        # metadata to request to bad actor api, in serializer
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def destroy(self, request, *args, **kwargs):
        contribution = self.get_object()
        if contribution.status not in (
            ContributionStatus.FAILED,
            ContributionStatus.PROCESSING,
            ContributionStatus.FLAGGED,
        ):
            logger.warning(
                "`PaymentViewset.destroy` was called on a contribution with status other than %s, %s, or %s."
                " contribution.id: %s, contribution.status: %s,  contributor.id: %s, donation_page.id: %s",
                ContributionStatus.FAILED.label,
                ContributionStatus.PROCESSING.label,
                ContributionStatus.FLAGGED.label,
                contribution.id,
                contribution.get_status_display(),
                contribution.contributor.id,
                contribution.donation_page.id,
            )
            return Response(status=status.HTTP_409_CONFLICT)
        try:
            contribution.cancel()
        except ContributionIntervalError:
            logger.exception(
                "`PaymentViewset.destroy` called for contribution with unexpected interval %s", contribution.interval
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ContributionStatusError:
            logger.exception(
                "`PaymentViewset.destroy` called for contribution with unexpected status %s", contribution.status
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except StripeError:
            logger.exception(
                "Something went wrong with Stripe while attempting to cancel payment with UUID %s",
                str(contribution.uuid),
            )
            return Response({"detail": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_204_NO_CONTENT)
