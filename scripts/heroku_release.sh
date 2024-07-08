#!/usr/bin/env bash
set -o nounset
set -o xtrace

if [ "$REVIEW_APP_FIRST_DEPLOY_DONE" == "true" ]; then
    echo "Triggering E2E check for contribution checkout flow"
    python manage.py trigger_e2e_check \
        --flow contribution_checkout \
        --commit-sha $SOURCE_VERSION \
        --async \
        --report-results
else
    echo "Skipping E2E check for contribution checkout flow because initial deployment has not occurred"
fi
exit 0
