#!/usr/bin/env bash

set -o nounset
set -o xtrace

pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} \
    # Note that we exclude the django_migrations table because the source database will not have any
    # migrations that are unique to the feature branch.
  --exclude-table='public.django_migrations' \
  --exclude-table='public.django_migrations_id_seq' | \
# We use the --data-only flag so that we only restore data from source that
# has counterparts in the target database tables.
pg_restore --data-only --clean --no-owner --no-acl \
  --format=custom --if-exists -d ${DATABASE_URL} || true
python manage.py bootstrap-review-app
