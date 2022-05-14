import random

import factory
from factory.django import DjangoModelFactory

from apps.common.models import RevEngineHistoricalChange


class RevEngineHistoricalChangeFactory(DjangoModelFactory):
    class Meta:
        model = RevEngineHistoricalChange

    app_label = factory.Faker("text", max_nb_chars=20)
    model = factory.Faker("text", max_nb_chars=20)
    object_id = factory.LazyAttribute(lambda x: random.randint(1, 10000))
    history_date = factory.Faker("date")
    history_type = RevEngineHistoricalChange.SIMPLE_HISTORY_TYPE_CREATED[0]
