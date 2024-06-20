#!/usr/bin/env bash

set -o nounset
set -o xtrace


# We dump the target database excluding the django_migrations table and id sequence
# because in release step, migrations are run, and they won't be reflected in source
# db's django_migrations table.
pg_dump \
    --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} \
    --exclude-table='public.django_migrations' \
    --exclude-table='public.django_migrations_id_seq' | \
pg_restore \
    --if-exists \
    --no-owner \
    --no-acl \
    --format=custom \
    -d ${DATABASE_URL} || true
python manage.py bootstrap-review-app
