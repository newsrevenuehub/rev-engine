#!/bin/sh
set -e


>&2 echo "Running Migrations in deployment-tasks.sh"
python manage.py migrate --noinput
