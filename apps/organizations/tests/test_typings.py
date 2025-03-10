from ..typings import MailchimpProductType, MailchimpSegmentName


class TestMailchimpProductType:
    def test_as_mailchimp_product_name(self):
        assert MailchimpProductType.ONE_TIME.as_mailchimp_product_name() == "one-time contribution"
        assert MailchimpProductType.YEARLY.as_mailchimp_product_name() == "yearly contribution"
        assert MailchimpProductType.MONTHLY.as_mailchimp_product_name() == "monthly contribution"

    def test_as_rp_field(self):
        assert MailchimpProductType.ONE_TIME.as_rp_field() == "mailchimp_one_time_contribution_product"
        assert MailchimpProductType.YEARLY.as_rp_field() == "mailchimp_yearly_contribution_product"
        assert MailchimpProductType.MONTHLY.as_rp_field() == "mailchimp_monthly_contribution_product"

    def test_as_mailchimp_product_id(self):
        assert MailchimpProductType.ONE_TIME.as_mailchimp_product_id(1) == "rp-1-one-time-contribution-product"
        assert MailchimpProductType.YEARLY.as_mailchimp_product_id(2) == "rp-2-yearly-contribution-product"
        assert MailchimpProductType.MONTHLY.as_mailchimp_product_id(3) == "rp-3-monthly-contribution-product"

    def test_as_str(self):
        assert str(MailchimpProductType.ONE_TIME) == "one_time"
        assert str(MailchimpProductType.YEARLY) == "yearly"
        assert str(MailchimpProductType.MONTHLY) == "monthly"


class TestMailchimpSegmentName:
    def test_as_rp_field(self):
        assert MailchimpSegmentName.ALL_CONTRIBUTORS.as_rp_field() == "mailchimp_all_contributors_segment"
        assert MailchimpSegmentName.ONE_TIME_CONTRIBUTORS.as_rp_field() == "mailchimp_one_time_contributors_segment"
        assert MailchimpSegmentName.RECURRING_CONTRIBUTORS.as_rp_field() == "mailchimp_recurring_contributors_segment"
        assert MailchimpSegmentName.MONTHLY_CONTRIBUTORS.as_rp_field() == "mailchimp_monthly_contributors_segment"
        assert MailchimpSegmentName.YEARLY_CONTRIBUTORS.as_rp_field() == "mailchimp_yearly_contributors_segment"

    def test_as_rp_id_field(self):
        assert MailchimpSegmentName.ALL_CONTRIBUTORS.as_rp_id_field() == "mailchimp_all_contributors_segment_id"
        assert (
            MailchimpSegmentName.ONE_TIME_CONTRIBUTORS.as_rp_id_field() == "mailchimp_one_time_contributors_segment_id"
        )
        assert (
            MailchimpSegmentName.RECURRING_CONTRIBUTORS.as_rp_id_field()
            == "mailchimp_recurring_contributors_segment_id"
        )
        assert MailchimpSegmentName.MONTHLY_CONTRIBUTORS.as_rp_id_field() == "mailchimp_monthly_contributors_segment_id"
        assert MailchimpSegmentName.YEARLY_CONTRIBUTORS.as_rp_id_field() == "mailchimp_yearly_contributors_segment_id"

    def test_get_creation_config(self):
        """Prove that creation config per type is what we expect.

        This test testing exact implementation, which is normally not useful, but in this case, it's important
        as we want a guarantee that the dict doesn't change without us knowing, as it impacts how segments get created in Mailchimp.
        """
        is_condition = {"field": "ecomm_prod", "op": "is"}
        assert MailchimpSegmentName.ALL_CONTRIBUTORS.get_segment_creation_config() == {
            "match": "all",
            "conditions": [{"field": "ecomm_purchased", "op": "member"}],
        }
        assert MailchimpSegmentName.ONE_TIME_CONTRIBUTORS.get_segment_creation_config() == {
            "match": "all",
            "conditions": [
                {**is_condition, "value": MailchimpProductType.ONE_TIME.as_mailchimp_product_name()},
            ],
        }
        assert MailchimpSegmentName.RECURRING_CONTRIBUTORS.get_segment_creation_config() == {
            "match": "any",
            "conditions": [
                {
                    **is_condition,
                    "value": MailchimpProductType.YEARLY.as_mailchimp_product_name(),
                },
                {
                    **is_condition,
                    "value": MailchimpProductType.MONTHLY.as_mailchimp_product_name(),
                },
            ],
        }
        assert MailchimpSegmentName.MONTHLY_CONTRIBUTORS.get_segment_creation_config() == {
            "match": "all",
            "conditions": [
                {**is_condition, "value": MailchimpProductType.MONTHLY.as_mailchimp_product_name()},
            ],
        }
        assert MailchimpSegmentName.YEARLY_CONTRIBUTORS.get_segment_creation_config() == {
            "match": "all",
            "conditions": [
                {**is_condition, "value": MailchimpProductType.YEARLY.as_mailchimp_product_name()},
            ],
        }

    def test_as_str(self):
        assert str(MailchimpSegmentName.ALL_CONTRIBUTORS) == "All contributors"
        assert str(MailchimpSegmentName.ONE_TIME_CONTRIBUTORS) == "One-time contributors"
        assert str(MailchimpSegmentName.RECURRING_CONTRIBUTORS) == "Recurring contributors"
        assert str(MailchimpSegmentName.MONTHLY_CONTRIBUTORS) == "Monthly contributors"
        assert str(MailchimpSegmentName.YEARLY_CONTRIBUTORS) == "Yearly contributors"
