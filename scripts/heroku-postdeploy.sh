#!/usr/bin/env bash

set -o nounset
set -o xtrace


# We dump the target database excluding the django_migrations table and id sequence
# because in release step, migrations are run, and they won't be reflected in source
# db's django_migrations table.
pg_dump
    --schema-only \
    --no-owner \
    --no-acl \
    --format=custom \
    --file=schema_dump.sql ${REVIEW_APP_SOURCE_DATABASE_URL}

pg_restore
    --schema-only
    --no-owner
    --no-acl
    --format=custom -d ${DATABASE_URL} schema_dump.sql



python manage.py migrate


pg_dump \
    --data-only \
    --no-owner \
    --no-acl \
    --exclude-table='public.django_migrations' \
    --exclude-table='public.django_migrations_id_seq' \
    --format=custom \
    ${REVIEW_APP_SOURCE_DATABASE_URL} | \

pg_restore \
    --data-only \
    --no-owner \
    --no-acl \
    --format=custom \
    -d ${DATABASE_URL}

python manage.py bootstrap-review-app
