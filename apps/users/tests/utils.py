from django.contrib.auth import get_user_model

from apps.users.models import RoleAssignment
from apps.users.tests.factories import RoleAssignmentFactory


def create_test_user(user=None, role_assignment_data=None):
    user = get_user_model().objects.create_user(email="mytestuser@test.com", password="testing")
    if role_assignment_data:
        RoleAssignment.objects.create(user=user, **role_assignment_data)
    else:
        RoleAssignmentFactory(user=user)
    return user
