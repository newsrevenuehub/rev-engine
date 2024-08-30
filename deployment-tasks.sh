#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
python manage.py migrate --noinput


if [ "$POSTDEPLOY_DONE" = "true" ]; then
  echo "Postdeploy script has run. Proceeding with release actions..."
  python manage.py trigger_e2e_check \
        --module test_contribution_checkout \
        --commit-sha $SOURCE_VERSION \
        --report-results
else
  echo "Skipping E2E check for contribution checkout flow because initial deployment has not occurred"
  exit 0
fi
