#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
python manage.py migrate --noinput


if [ "$POSTDEPLOY_DONE" = "true" ] && [ "$E2E_ENABLED" = "true" ]; then
  if [ -z "$SOURCE_VERSION" ]; then
    echo "SOURCE_VERSION is not set so e2e checks will be skipped"
  else
    echo "Postdeploy script has run. Proceeding with release actions..."
    python manage.py trigger_e2e_check \
          --module test_contribution_checkout \
          --commit-sha $SOURCE_VERSION \
          --report-results
  fi
else
  echo "Skipping E2E check for contribution checkout flow. POSTDEPLOY_DONE=$POSTDEPLOY_DONE, E2E_ENABLED=$E2E_ENABLED"
  exit 0
fi
