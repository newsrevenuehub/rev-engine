#!/usr/bin/env bash

set -o nounset
set -o xtrace

echo "Resetting database"
heroku pg:reset $DATABASE_URL --confirm $HEROKU_APP_NAME

# Dump the source database to a file
echo "Dumping source database..."
pg_dump --format=custom $REVIEW_APP_SOURCE_DATABASE_URL -f dump_file.dump

# Restore the dump file to the new database
echo "Restoring dump to Heroku database..."
pg_restore --no-owner --no-acl --dbname=$DATABASE_URL dump_file.dump

# Clean up the dump file
echo "Cleaning up dump file..."
rm dump_file.dump

echo "Running migrations on top of restored database"
python manage.py migrate

echo "Bootstrapping review app"
python manage.py bootstrap-review-app
