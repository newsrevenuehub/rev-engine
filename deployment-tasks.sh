#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
python manage.py migrate --noinput

>&2 echo "Telling Github deployment has happened to trigger e2e tests"
# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
curl -X POST -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/newsrevenuehub/revengine/.github/workflows/e2e.yml/dispatches -d "{\"ref\":\"${CURRENT_BRANCH}\"}"
