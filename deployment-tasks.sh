#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
python manage.py migrate --noinput

# Fetch the configuration variables from Heroku
CONFIG_VARS=$(curl -n -X GET https://api.heroku.com/apps/$HEROKU_APP_NAME/config-vars \
-H "Content-Type: application/json" \
-H "Accept: application/vnd.heroku+json; version=3" \
-H "Authorization: Bearer $HEROKU_API_KEY")

# Extract the value of POSTDEPLOY_DONE using jq
POSTDEPLOY_DONE=$(echo $CONFIG_VARS | jq -r '.POSTDEPLOY_DONE')


if [ "$POSTDEPLOY_DONE" = "true" ]; then
  echo "Postdeploy script has run. Proceeding with release actions..."
  python manage.py trigger_e2e_check \
        --module test_contribution_checkout \
        --commit-sha $SOURCE_VERSION \
        --async \
        --report-results
else
  echo "Skipping E2E check for contribution checkout flow because initial deployment has not occurred"
  exit 0
fi
