#!/usr/bin/env bash

set -o nounset
set -o xtrace

# First we zero out the database.
# We want to be able to restore from backup without any conflicts.
echo "Resetting database"
psql -d ${DATABASE_URL} -c "DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;"


# Dump the source database to a file
echo "Dumping source database..."
pg_dump --format=custom $REVIEW_APP_SOURCE_DATABASE_URL -f dump_file.dump

# Restore the dump file to the new database
echo "Restoring dump to Heroku database..."
pg_restore --no-owner --no-acl --dbname=$DATABASE_URL dump_file.dump

# Clean up the dump file
echo "Cleaning up dump file..."
rm dump_file.dump

# Any net new migrations from our review app will be run here, on top of migration
# history copied over from the source database
echo "Running migrations on top of restored database"
python manage.py migrate

echo "Bootstrapping review app"
python manage.py bootstrap-review-app
