#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
ENABLE_GOOGLE_CLOUD_SECRET_MANAGER=False python manage.py migrate --noinput
