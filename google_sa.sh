#!/bin/sh
set -e

FILE="google-service-account.json"

>&2 echo "Setup Google Service Account"

if test -f $FILE; then
  >&2 echo "Google Service account file exists."
else
  >&2 echo "Creating Google Service account file"
  echo $GS_SERVICE_ACCOUNT > "google-service-account.json"
fi