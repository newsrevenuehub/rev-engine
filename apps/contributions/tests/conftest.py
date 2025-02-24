import json
from pathlib import Path

import pytest


@pytest.fixture
def invoice_payment_succeeded_for_recurring_payment_event():
    with Path("apps/contributions/tests/fixtures/invoice-payment-succeeded-for-recurring-event.json").open() as f:
        return json.load(f)
