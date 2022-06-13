#!/bin/sh
set -e

FILE="google-sa/google-service-account.json"

>&2 echo "Setup Google Service Account"

if test -f $FILE; then
  >&2 echo "Google Service account file exists."
  rm $FILE
  echo $GS_SERVICE_ACCOUNT | base64 -d > $FILE
else
  >&2 echo "Creating Google Service account file"
  echo $GS_SERVICE_ACCOUNT | base64 -d > $FILE
fi
