#!/usr/bin/env bash

set -o nounset
set -o xtrace


# Parse the DATABASE_URL to extract components
export PGUSER=$(echo $DATABASE_URL | sed -e 's/^postgres:\/\/\([^:]*\):.*$/\1/')
export PGPASSWORD=$(echo $DATABASE_URL | sed -e 's/^postgres:\/\/[^:]*:\([^@]*\)@.*$/\1/')
export PGHOST=$(echo $DATABASE_URL | sed -e 's/^postgres:\/\/[^@]*@\([^:]*\):.*$/\1/')
export PGPORT=$(echo $DATABASE_URL | sed -e 's/^postgres:\/\/[^:]*:[^@]*@[^:]*:\([^\/]*\)\/.*$/\1/')
export PGDATABASE=$(echo $DATABASE_URL | sed -e 's/^postgres:\/\/[^\/]*\/\(.*\)$/\1/')


# First we zero out the database.
# We want to be able to restore from backup without any conflicts.
echo "Drop all tables in db"
# Drop all tables in the database
TABLES=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
for TABLE in $TABLES; do
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "DROP TABLE IF EXISTS $TABLE CASCADE;"
done

# Drop all custom collations in the database
echo "Drop all custom collations in db"
COLLATIONS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "SELECT collname FROM pg_collation WHERE collname IN ('case_insensitive');")
for COLLATION in $COLLATIONS; do
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "DROP COLLATION IF EXISTS $COLLATION;"
done


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

echo "SOURCE VERSION IS ${SOURCE_VERSION}"


# Note that setting this will trigger a subsequent release
# and when release phase runs deployment-tasks.sh, it will find this
# var set to true, and run the E2E check
echo "Setting POSTDEPLOY_DONE to true"
curl -n -X PATCH https://api.heroku.com/apps/$HEROKU_APP_NAME/config-vars \
-H "Content-Type: application/json" \
-H "Accept: application/vnd.heroku+json; version=3" \
-H "Authorization: Bearer $HEROKU_API_KEY" \
-d '{"POSTDEPLOY_DONE":"true"}'
