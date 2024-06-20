#!/usr/bin/env bash

set -o nounset
set -o xtrace


# Initially we delete the database. This will allow us to restore from dump,
# then run branch specific migrations on to of that restore.
# First ensure we have a database url to work with.
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi
# Extract the database name from DATABASE_URL
DESTINATION_DB_NAME=$(echo $DATABASE_URL | grep -oE '[^/]+$')
echo "Destination database name: $DESTINATION_DB_NAME"
echo "Dropping database $DESTINATION_DB_NAME"
psql ${DATABASE_URL} -c "DROP DATABASE $DESTINATION_DB_NAME;"
echo "Creating database $DESTINATION_DB_NAME"
psql -d postgres -c "CREATE DATABASE $DESTINATION_DB_NAME;"

echo "Restoring database from $REVIEW_APP_SOURCE_DATABASE_URL"
pg_dump --format=custom ${REVIEW_APP_SOURCE_DATABASE_URL} | \
pg_restore --no-owner --no-acl-d ${DATABASE_URL}

echo "Running migrations on top of restored database"
python manage.py migrate

echo "Bootstrapping review app"
python manage.py bootstrap-review-app
