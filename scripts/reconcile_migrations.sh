
#!/usr/bin/env bash

set -o xtrace

# This script does not need to be around long, and is only required
# to get prod and staging databases in good state after merging this branch.
# At that point, the app will have reset migrations, but the database will still
# contain entries in `django_migrations` for all of the old migrations. This script
# fake migrates back to zero (with exception of config and users, which need to go back to 0001,
# otherwise migrations break) before fake migrating all migrations at end.
# The net effect is to drop all of the stale entries from the `django_migrations` table
# and get it to reflect that the new, reset migrations have been run.
python manage.py migrate --fake config 0001
python manage.py migrate --fake users 0001
python manage.py migrate --fake common zero
python manage.py migrate --fake contributions zero
python manage.py migrate --fake element_media zero
python manage.py migrate --fake organizations zero
python manage.py migrate --fake pages zero
python manage.py migrate --fake slack zero
python manage.py migrate --fake
