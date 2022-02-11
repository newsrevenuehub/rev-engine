# Generated by Django 3.2.5 on 2022-02-09 12:56

from django.db import migrations


def forwards_func(apps, schema_editor):
    """
    This is part of the effort to remove the FK to Org on Styles and replace it with an
    FK to RevenueProgram. In order to preserve existing styles, we have chosen to:
    1. For every Style, choosen a RevenueProgram that uses this Style that will now "own" this style.
    2. For every RevenueProgram that uses that style, other than the new "owner", create a duplicate
       of that original Style that its pages can use. This duplicate now belongs to this RevenueProgram.
    3. For every Style not associated with any Page, associate it with the first RevenueProgram related to its Org
    """
    Style = apps.get_model("pages", "Style")
    RevenueProgram = apps.get_model("organizations", "RevenueProgram")

    for style in Style.objects.all():
        # RevenuePrograms that have DonationPages that use this style
        revenue_programs = RevenueProgram.objects.filter(donationpage__styles=style).distinct()

        if revenue_programs:
            # For the first RevenueProgram that has DonationPages that use this style, assign this Style to that RevenueProgram.
            style.revenue_program = revenue_programs[0]

            # For the rest of the RevenuePrograms...
            for revenue_program in revenue_programs[1:]:
                """
                The DonationPages for these RevenuePrograms use this Style, but this Style no longer belongs to
                the this RevenueProgram. We should:
                - Create a duplicate of the Style
                - Assign the duplicate this RevenueProgram
                - Replace all the DonationPages that have this Style set with this duplicate
                """
                # Create duplicate of Style, assigned to this RevenueProgram
                duplicate_style = Style.objects.create(
                    name=f"{style.name} [duplicate]", styles=style.styles, revenue_program=revenue_program
                )

                # For all DonationPages that use this Style in this RevenueProgram, replace Style with duplicate
                revenue_program.donationpage_set.filter(styles=style).update(styles=duplicate_style)
        else:
            # revenue_programs is empty. This indicates that this Style is not used on any DonationPages.
            # We still must assign it to a RevenueProgram, so let's just pick the first RevenueProgram this
            # Organization owns.
            style.revenue_program = style.organization.revenueprogram_set.first()

        style.save()


def reverse_func(apps, schema_editor):
    """
    There's very little we can do here. The best we can manage is to assign Styles to the Organization
    that their RevenueProgram belongs to. "Undoing" the duplicates is almost certainly not worth it here.
    """
    Style = apps.get_model("pages", "Style")

    for style in Style.objects.all():
        style.organization = style.revenue_program.organization
        style.save()


class Migration(migrations.Migration):

    dependencies = [
        ("pages", "0040_auto_20220209_1255"),
    ]

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]
