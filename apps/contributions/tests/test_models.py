# apps/contributions/models.py      11, 15, 19, 23, 26, 63, 67
import datetime

from django.test import TestCase
from django.utils import timezone

from apps.contributions.models import Contribution, Contributor


class ContributorTest(TestCase):
    def setUp(self):
        self.contributor = Contributor.objects.create(email="test@test.com")

    def test_contributions_count(self):
        target_count = 5
        for _ in range(target_count):
            contribution = Contribution.objects.create(amount=1000, contributor=self.contributor)

        self.assertEqual(self.contributor.contributions_count, target_count)

    def test_most_recent_contribution(self):
        first_contribution = Contribution.objects.create(
            amount=1000, contributor=self.contributor, payment_state="paid"
        )
        one_minute = datetime.timedelta(minutes=1)
        second_contribution = Contribution.objects.create(
            amount=1000,
            contributor=self.contributor,
            payment_state="paid",
            modified=timezone.now() + one_minute,
        )
        self.assertEqual(self.contributor.most_recent_contribution, second_contribution)

    def test__str(self):
        self.assertEqual(str(self.contributor), self.contributor.email)


class ContributionTest(TestCase):
    def setUp(self):
        self.amount = 1000
        self.contribution = Contribution.objects.create(amount=self.amount)

    def test_formatted_amount(self):
        target_format = f"{float(self.amount / 100)} {self.contribution.currency.upper()}"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

    def test_expanded_bad_actor_score(self):
        # First, expanded_bad_actor_score should be none by default
        score = 2
        self.assertIsNone(self.contribution.expanded_bad_actor_score)
        self.contribution.bad_actor_score = score
        self.contribution.save()
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.expanded_bad_actor_score, Contribution.BAD_ACTOR_SCORES[2][1])
