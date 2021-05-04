from django.conf import settings

import djstripe
import stripe
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.organizations.models import Organization


class StripePaymentProvider:
    def calculate_payment_amount(self, amount: str) -> int:
        """
        Stripe expects payments to be in cents.
        """
        return int(float(amount) * 100)


@api_view(["POST", "PATCH"])
def stripe_payment_intent(request):
    provider = StripePaymentProvider()
    if request.method == "POST":
        try:
            org_slug = request.data.get("org_slug")
            organization = Organization.objects.get(slug=org_slug)
            api_key = organization.stripe_account.get_default_api_key()

            payment_amount = provider.calculate_payment_amount(request.data.get("payment_amount"))
            # payment_frequency = request.data.get('payment_frequency')

            stripe_intent = stripe.PaymentIntent.create(
                amount=payment_amount,
                currency=settings.DEFAULT_CURRENCY,
                payment_method_types=["card"],
                api_key=api_key,
            )

            intent = djstripe.models.PaymentIntent.sync_from_stripe_data(stripe_intent)

            return Response(
                data={"clientSecret": intent.client_secret}, status=status.HTTP_201_CREATED
            )

        except Organization.DoesNotExist:
            return Response(
                data={"org_slug": [f'Could not find Organization from slug "{org_slug}"']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # except stripe.error.CardError as e:
        #     # Since it's a decline, stripe.error.CardError will be caught

        #     print('Status is: %s' % e.http_status)
        #     print('Code is: %s' % e.code)
        #     # param is '' in this case
        #     print('Param is: %s' % e.param)
        #     print('Message is: %s' % e.user_message)
        # except stripe.error.RateLimitError as e:
        #     # Too many requests made to the API too quickly
        #     pass
        # except stripe.error.InvalidRequestError as e:
        #     # Invalid parameters were supplied to Stripe's API
        #     pass
        # except stripe.error.AuthenticationError as e:
        #     # Authentication with Stripe's API failed
        #     # (maybe you changed API keys recently)
        #     pass
        # except stripe.error.APIConnectionError as e:
        #     # Network communication with Stripe failed
        #     pass
        # except stripe.error.StripeError as e:
        #     # Display a very generic error to the user, and maybe send
        #     # yourself an email
        #     pass
        # except Exception as e:
        #     # Something else happened, completely unrelated to Stripe
        #     pass

    if request.method == "PATCH":
        pass
        # update existing PaymentIntent
        # try:

        # except

        # if org_slug:=request.POST.get('org_slug'):
        #     if organization:=Organization.objects.filter(slug=org_slug).first():
        #     else:
        # else:
        #     return Response(data={'org_slug': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
        # organization = request.POST.get('org_slug')
        # stripe.PaymentIntent.create(
        #     api_key=
        # )
        # or djstripe.PaymentIntent.create()?
        # breakpoint()
        # data = {}
        # try:
        #     if "payment_method_id" in data:
        #         # Create the PaymentIntent
        #         intent = stripe.PaymentIntent.create(
        #             payment_method=data["payment_method_id"],
        #             amount=1099,
        #             currency="usd",
        #             confirmation_method="manual",
        #             confirm=True,
        #             api_key=djstripe.settings.STRIPE_SECRET_KEY,
        #         )
        #     elif "payment_intent_id" in data:
        #         intent = stripe.PaymentIntent.confirm(
        #             data["payment_intent_id"],
        #             api_key=djstripe.settings.STRIPE_SECRET_KEY,
        #         )
        # except stripe.error.CardError as e:
        #     # Display error on client
        #     return_data = json.dumps({"error": e.user_message}), status.HTTP_200_OK
        #     return Response(
        #         return_data[0], status=return_data[1]
        #     )

        # if (
        #     intent.status == "requires_action"
        #     and intent.next_action.type == "use_stripe_sdk"
        # ):
        #     # Tell the client to handle the action
        #     return_data = (
        #         json.dumps(
        #             {
        #                 "requires_action": True,
        #                 "payment_intent_client_secret": intent.client_secret,
        #             }
        #         ),
        #         status.HTTP_200_OK,
        #     )
        # elif intent.status == "succeeded":
        #     # The payment did not need any additional actions and completed!
        #     # Handle post-payment fulfillment
        #     return_data = json.dumps({"success": True}), status.HTTP_200_OK
        # else:
        #     # Invalid status
        #     return_data = json.dumps({"error": "Invalid PaymentIntent status"}), status.HTTP_500_INTERNAL_SERVER_ERROR
        # return Response(
        #     return_data[0], content_type="application/json", status=return_data[1]
        # )
