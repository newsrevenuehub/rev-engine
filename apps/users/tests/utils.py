from django.contrib.auth import get_user_model

from faker import Faker

from apps.users.models import RoleAssignment
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory


fake = Faker()
Faker.seed(0)


def create_test_user(user=None, role_assignment_data=None):
    if not user:
        user = UserFactory()
    if role_assignment_data:
        rps = role_assignment_data.pop("revenue_programs", None)
        org = role_assignment_data.pop("organization", None)
        ra = RoleAssignmentFactory(user=user, **role_assignment_data)
        do_save = False
        if rps:
            ra.revenue_programs.set(rps)
            do_save = True
        if org:
            do_save = True
            ra.organization = org
        if do_save:
            ra.save()
    else:
        RoleAssignmentFactory(user=user)
    return user
