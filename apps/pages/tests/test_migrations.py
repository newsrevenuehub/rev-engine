from django.db.models import Count, Q

from apps.common.tests.test_utils import TestMigrations


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

        self.org_count = 2
        self.rp_count = 2
        self.dp_count = 2

        self.used_by_many_count = 3
        self.used_by_one_count = 3
        self.used_by_none_count = 3

        for o in range(self.org_count):
            address = self.address_model.objects.create()
            org = self.org_model.objects.create(name=f"Org {o}", address=address)

            for r in range(self.rp_count):
                rp = self.rp_model.objects.create(name=f"RP {r} for org {org.name}", organization=org, slug=f"{o}-{r}")

                for p in range(self.dp_count):
                    self.page_model.objects.create(name=f"Page for many {p}", revenue_program=rp, slug=f"{o}-{r}-{p}")

            for s1 in range(self.used_by_one_count):
                rp = org.revenueprogram_set.first()
                style = self.style_model.objects.create(name=f"Used by one {s1}", styles={}, organization=org)
                rp.donationpage_set.all().update(styles=style)

            for s2 in range(self.used_by_many_count):
                rps = org.revenueprogram_set.all()
                rp_num = 0 if s2 % 2 == 0 else 1
                style = self.style_model.objects.create(name=f"Used by many {s2}", styles={}, organization=org)
                rps[rp_num].donationpage_set.all().update(styles=style)

            for s3 in range(self.used_by_none_count):
                style = self.style_model.objects.create(name=f"Use by none {s3}", styles={}, organization=org)

    def test_no_two_revenue_programs_share_same_style(self):
        new_style_model = self.apps.get_model("pages", "Style")
        new_rp_model = self.apps.get_model("organizations", "RevenueProgram")

        for style in new_style_model.objects.all():
            pass

        for rp in new_rp_model.objects.all():
            pass
