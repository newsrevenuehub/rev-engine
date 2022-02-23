import logging

from django.conf import settings
from django.db.models import Count, Q

from apps.common.tests.test_utils import TestMigrations


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class StyleOrgFKToStyleRPFKTest(TestMigrations):
    """
    Test the data migration that removes the ForeignKey on Style to Organization and replaces
    it with a ForeignKey to RevenueProgram. This migration makes some assumptions about how we
    want pre-existing styles to look after the data migration, so that is primarily what is
    tested here.
    """

    migrate_from = "0040_auto_20220209_1255"
    migrate_to = "0041_auto_20220209_1256"

    def setUpBeforeMigration(self, apps):
        """
        Possible states of Styles:

        Is used by DonationPages across multiple RevenuePrograms
        Is used by DonationPages in only one RevenueProgram
        Is not used by any DonationPages
        """

        self.style_model = apps.get_model("pages", "Style")
        self.page_model = apps.get_model("pages", "DonationPage")
        self.rp_model = apps.get_model("organizations", "RevenueProgram")
        self.org_model = apps.get_model("organizations", "Organization")
        self.address_model = apps.get_model("common", "Address")

        self.used_by_many_count = 3
        self.used_by_one_count = 3
        self.used_by_none_count = 3

        self.styles_used_by_many = []
        self.styles_used_by_one = []
        self.styles_used_by_none = []

        address = self.address_model.objects.create()
        self.org = self.org_model.objects.create(name=f"The Org", address=address)

        for s in range(self.used_by_many_count):
            style = self.style_model.objects.create(name=f"Used by many {s+1}", styles={}, organization=self.org)
            self.styles_used_by_many.append(style)
            rps_count = 2

            for r in range(rps_count):
                rp = self.rp_model.objects.create(
                    name=f"RP for Styles Used by Many {r}", organization=self.org, slug=f"ubm-rp-s{s+1}-r{r+1}"
                )

                self.page_model.objects.create(
                    name=f"Page for RP {rp.name}",
                    revenue_program=rp,
                    slug=f"ubm-s{s+1}-r{r+1}-p{r+1}",
                    styles=style,
                )

        ubo_rp = self.rp_model.objects.create(name=f"RP for Styles Used by One", organization=self.org, slug=f"ubo-rp")
        for s in range(self.used_by_one_count):
            style = self.style_model.objects.create(name=f"Used by one {s+1}", styles={}, organization=self.org)
            self.styles_used_by_one.append(style)

            dp_count = 2

            for p in range(dp_count):
                self.page_model.objects.create(
                    name=f"Page {p+1} for RP {ubo_rp.name}",
                    revenue_program=ubo_rp,
                    slug=f"ubo-s{s+1}-p{p+1}",
                    styles=style,
                )

        one_more_rp_for_good_measure = self.rp_model.objects.create(
            name=f"RP for Styles Used by None", organization=self.org, slug=f"ubn-rp"
        )
        some_other_style = self.style_model.objects.create(name="Some other style", styles={}, organization=self.org)
        for s in range(self.used_by_none_count):
            style = self.style_model.objects.create(name=f"Used by none {s+1}", styles={}, organization=self.org)
            self.styles_used_by_none.append(style)

            dp_count = 2

            for p in range(dp_count):
                self.page_model.objects.create(
                    name=f"Page {p+1} for RP {one_more_rp_for_good_measure.name}",
                    revenue_program=one_more_rp_for_good_measure,
                    slug=f"ubn-s{s+1}-p{p+1}",
                    styles=some_other_style,
                )

    def test_styles_used_by_many(self):
        """
        Styles used by many should only be associated with one RevenueProgram, and no DonationPages outside that RevenueProgram
        should be using this Style. There should be duplicates of this style used on the DonationPages not on that first RevenueProgram
        """
        style_model = self.apps.get_model("pages", "Style")
        dp_model = self.apps.get_model("pages", "DonationPage")

        ubm_pks = [s.pk for s in self.styles_used_by_many]

        for ubm_style in style_model.objects.filter(pk__in=ubm_pks):
            # RevenuePrograms that have pages that use this style.
            rps_count = (
                dp_model.objects.filter(styles=ubm_style)
                .values_list("revenue_program__pk", flat=True)
                .distinct()
                .count()
            )

            # Should only be one RevenueProgram using this style
            self.assertEqual(rps_count, 1)

            duplicates = style_model.objects.filter(name__icontains=ubm_style.name)

            # The number of duplicates of this Style should equal the original original count minus one
            self.assertEqual(len(duplicates), self.used_by_many_count - 1)

    def test_styles_used_by_one(self):
        """
        Styles used by DonationPages in only one RevenueProgram should not be duplicted. Their RevenueProgram
        should belong to their Organization and match that of their DonationPage
        """
        style_model = self.apps.get_model("pages", "Style")
        dp_model = self.apps.get_model("pages", "DonationPage")

        ubo_pks = [s.pk for s in self.styles_used_by_one]

        for ubo_style in style_model.objects.filter(pk__in=ubo_pks):
            duplicates_exist = (
                self.style_model.objects.filter(name__contains=ubo_style.name).exclude(pk=ubo_style.pk).exists()
            )
            self.assertFalse(duplicates_exist)

            rp_belongs_to_org = ubo_style.revenue_program in ubo_style.organization.revenueprogram_set.all()
            self.assertTrue(rp_belongs_to_org)

            rps_using_this_style = (
                dp_model.objects.filter(styles=ubo_style).values("revenue_program").distinct().count()
            )
            self.assertEqual(rps_using_this_style, 1)

    def test_styles_used_by_none(self):
        """
        Styles used by no donation pages should do nothing but get assigned to the "first"
        RevenueProgram in their parent Org.
        """
        style_model = self.apps.get_model("pages", "Style")
        dp_model = self.apps.get_model("pages", "DonationPage")

        ubn_pks = [s.pk for s in self.styles_used_by_none]

        for ubn_style in style_model.objects.filter(pk__in=ubn_pks):
            duplicates_exist = (
                self.style_model.objects.filter(name__contains=ubn_style.name).exclude(pk=ubn_style.pk).exists()
            )
            self.assertFalse(duplicates_exist)

            rp_belongs_to_org = ubn_style.revenue_program in ubn_style.organization.revenueprogram_set.all()
            self.assertTrue(rp_belongs_to_org)

            rps_using_this_style = (
                dp_model.objects.filter(styles=ubn_style).values("revenue_program").distinct().count()
            )
            self.assertEqual(rps_using_this_style, 0)
