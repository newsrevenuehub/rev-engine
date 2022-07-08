#!/usr/bin/env bash

set -o nounset
set -o xtrace


# We drop all tables before dumping/restoring to ensure that we don't
# end up with rebuilds that fail on (re-)migration. This can happen when
# a new table gets created earlier in build/deploy steps. Since we restore
# from staging db here, staging will by definition not have those tables in it,
# and its record of applied migrations in `django_migrations` will not contain
# references to the new model's migrations having been applied. When the restore happens,
# it will drop the existing `django_migrations` table in our target db in favor of the table
# from the dumped (staging) db. However, since the new model/table is not in the dump db,
# but is already in the target db, it will remain in place, without being reflected as
# created in `django_migrations`. Subsequent runs of the migrations will fail when
# Django tries to create the already existing new model/table.
psql -d ${DATABASE_URL} -c "DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;"

pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} | pg_restore --clean --no-owner --no-acl --format=custom --if-exists -d ${DATABASE_URL} || true


# users and config retained their first migrations, respectively, so don't need `--fake-initial``
python manage.py migrate --fake users
python manage.py migrate --fake config
python manage.py migrate --fake-initial common
python manage.py migrate --fake-initial contributions
python manage.py migrate --fake contributions
python manage.py migrate --fake-initial element_media
python manage.py migrate --fake-initial emails
# organizations needs `--fake-initial` and `--fake` because it ends up with two migrations, and the second
# is not presupposed by previously faked migrations above.
python manage.py migrate --fake-initial organizations
python manage.py migrate --fake organizations
python manage.py migrate --fake-initial pages
python manage.py migrate --fake-initial slack

python manage.py bootstrap-review-app

# TODO: [DEV-1985] Delete heroku-post-migration-reset-postdeploy.sh and revert
# app.json to point at to `./scripts/heroku-postdeploy.sh` after this branch is merged to staging
