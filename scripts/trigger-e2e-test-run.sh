#!/bin/bash

# Make a POST request to trigger the test suite on the review app server
echo "Triggering e2e test run on review app server at $SITE_URL"
curl -X POST "$SITE_URL/api/v1/e2e/" \
     -H "Content-Type: application/json" \
     -d '{
           "commit_sha": "'"$HEROKU_SLUG_COMMIT"'",
           "github_token": "'"$GH_TOKEN"'"
           "tests": ["contribution_checkout"]
         }'
