from django.urls import include, path

from apps.contributions import views


urlpatterns = [
    path("stripe/", include("djstripe.urls", namespace="djstripe")),
    path("stripe/payment-intent/", views.stripe_payment_intent, name="stripe-payment-intent"),
]
