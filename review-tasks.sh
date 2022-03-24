#!/bin/sh
set -e

/bin/sh ./google_sa.sh

#>&2 echo "Running bootstrap-review-app"
#python manage.py bootstrap-review-app

>&2 echo "Running Migrations"
python manage.py migrate --noinput
