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
python manage.py bootstrap-review-app
