from django.urls import path

from apps.users import views


urlpatterns = [
    path("users/", views.retrieve_user, name="user-retrieve"),
]
