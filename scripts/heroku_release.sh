#!/usr/bin/env bash
set -o nounset
set -o xtrace

CONFIG_VARS=$(curl -n -X GET https://api.heroku.com/apps/$HEROKU_APP_NAME/config-vars \
-H "Content-Type: application/json" \
-H "Accept: application/vnd.heroku+json; version=3" \
-H "Authorization: Bearer $HEROKU_API_KEY")

POSTDEPLOY_DONE=$(echo $CONFIG_VARS | grep -o '"POSTDEPLOY_DONE":[^,]*' | sed 's/"POSTDEPLOY_DONE":"\([^"]*\)"/\1/')

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
