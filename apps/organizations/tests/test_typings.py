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
        assert MailchimpProductType.ONE_TIME.as_mailchimp_product_id(1) == "rp-one-time-1-contribution-product"
        assert MailchimpProductType.YEARLY.as_mailchimp_product_id(2) == "rp-yearly-2-contribution-product"
        assert MailchimpProductType.MONTHLY.as_mailchimp_product_id(3) == "rp-monthly-3-contribution-product"


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
