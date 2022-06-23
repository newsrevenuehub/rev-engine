#!/bin/sh
set -e

>&2 echo "Running Migrations"
python manage.py migrate --noinput
>&2 echo "Running fake reversion migration"
python manage.py migrate reversion --fake --noinput
