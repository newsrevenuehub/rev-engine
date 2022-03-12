#!/usr/bin/env bash

set -o nounset
set -o xtrace

echo $DATABASE_URL
echo $REVIEW_APP_SOURCE_DATABASE_URL

pg_dump --version
#pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} > /tmp/pgdump.out 
#
#pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} | pg_restore --clean --no-owner --no-acl --format=custom --if-exists -d ${DATABASE_URL} || true
