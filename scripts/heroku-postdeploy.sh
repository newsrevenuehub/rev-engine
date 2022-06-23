#!/usr/bin/env bash

set -o nounset
set -o xtrace




psql -d ${DATABASE_URL} -c "DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;"

pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} | pg_restore --clean --no-owner --no-acl --format=custom --if-exists -d ${DATABASE_URL} || true
python manage.py bootstrap-review-app
