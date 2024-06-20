#!/usr/bin/env bash

set -o nounset
set -o xtrace

# zero out, because migrations will have been run in earlier step, and potentially conflict with what's in backup
psql -d ${DATABASE_URL} -c "DROP SCHEMA public CASCADE;
DROP OWNED by current_user CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
"


python manage.py migrate --noinput

pg_dump \
    --format=custom \
    --exclude-table='public.django_migrations' \
    --exclude-table='public.django_migrations_id_seq' \
    ${REVIEW_APP_SOURCE_DATABASE_URL} | \

pg_restore \
    --data-only \
    --no-owner \
    --no-acl \
    --format=custom \
    -d ${DATABASE_URL}
python manage.py bootstrap-review-app
