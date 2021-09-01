from django.test import TestCase

from apps.common.models import Address


class AddressTest(TestCase):
    def test_address_to_string(self):
        address1 = "123 Testing"
        address2 = "Suite 2"
        city = "Testville"
        state = "TS"
        postal_code = "54321"
        target_string = f"{address1} {address2}, {city}, {state} {postal_code}"
        address = Address.objects.create(
            address1=address1,
            address2=address2,
            city=city,
            state=state,
            postal_code=postal_code,
        )

        self.assertEqual(target_string, str(address))
