#!/usr/bin/env bash

set -o nounset
set -o xtrace

pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} | pg_restore --clean --no-owner --no-acl --format=custom --if-exists -d ${DATABASE_URL} || true
python manage.py bootstrap-review-app