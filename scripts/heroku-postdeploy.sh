#!/usr/bin/env bash

set -o nounset
set -o xtrace

# We seed the database with the data from the source database. Note that we exclude the django_migrations table because
# the source database will not have any migrations that are unique to the feature branch.
pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} --exclude-table='django_migrations' | pg_restore --clean --no-owner --no-acl --format=custom --if-exists -d ${DATABASE_URL} || true
python manage.py bootstrap-review-app
