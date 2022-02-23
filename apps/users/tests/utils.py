from django.contrib.auth import get_user_model

from faker import Faker

from apps.users.models import RoleAssignment
from apps.users.tests.factories import RoleAssignmentFactory


fake = Faker()
Faker.seed(0)


def create_test_user(user=None, role_assignment_data=None):
    if not user:
        user = get_user_model().objects.create_user(email=fake.email(), password="testing")
    if role_assignment_data:
        RoleAssignment.objects.create(user=user, **role_assignment_data)
    else:
        RoleAssignmentFactory(user=user)
    return user
