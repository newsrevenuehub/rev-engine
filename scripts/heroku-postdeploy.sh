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
# the feature branch's migrations initially get applied as part of the normal build CI process, but here in review app post deploy step,
# we drop all the tables before restoring from staging (see reason above), which means that any new migrations get whomped. So we run migrations again here.
python manage.py migrate --noinput
python manage.py bootstrap-review-app
