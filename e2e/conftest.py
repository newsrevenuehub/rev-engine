import random
import string

import pytest
from playhouse.db_url import connect
from playhouse.reflection import Introspector

from e2e import config


@pytest.fixture
def models():
    """For purposes of e2e tests, we've decided to interrogate the database directly rather than
    relying on application source code to generate models. This is because we want to test the system
    in terms of more generic expectations rather than specific implementation details that we would be
    understandably tempted to have recourse to if we use the Django db models.

    TODO: Figure out how to set up a read only user for the database and use that here. Has to involve post-deploy
    script.
    """
    db = connect(config.DATABASE_URL)
    introspector = Introspector.from_database(db)
    models = introspector.generate_models()

    yield models

    db.close()


@pytest.fixture
def email():
    return f"revengine-e2e+{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}+approved@fundjournalism.org"
