#!/bin/sh
set -e

>&2 echo "Running Migrations"
python manage.py migrate --noinput
