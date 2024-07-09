import datetime
import random

from factory import LazyFunction
from factory.django import DjangoModelFactory
from faker import Faker

from apps.common.tests.test_utils import generate_random_datetime
from apps.e2e.choices import CommitStatusState
from apps.e2e.models import CommitStatus


fake = Faker()

NOW = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
THEN = NOW - datetime.timedelta(weeks=52)


class CommitStatusFactory(DjangoModelFactory):
    class Meta:
        model = CommitStatus

    created = LazyFunction(lambda: generate_random_datetime(THEN, NOW))
    state = LazyFunction(lambda: random.choice(CommitStatusState.choices)[0])
    github_id = LazyFunction(lambda: random.randint(1, 10000))
    name = LazyFunction(lambda: fake.word())
    commit_sha = LazyFunction(lambda: fake.sha1())
    details = LazyFunction(lambda: fake.paragraph())
    screenshot = LazyFunction(lambda: fake.image_url())
