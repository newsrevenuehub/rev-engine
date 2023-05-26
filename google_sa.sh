#!/bin/sh
set -e

FILE="google-sa/google-service-account.json"

>&2 echo "google_sa.sh | Setting up Google Service Account credentials"
echo $GS_SERVICE_ACCOUNT | base64 -d >| $FILE
stat $FILE
