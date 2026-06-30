#!/usr/bin/env bash
#
# db-push.sh - Overwrites the production database with the local dev copy.
#
# Usage:
#   ./scripts/db-push.sh [--confirm]
#
#   --confirm  Skip the interactive prompt and proceed immediately.
#              Only use in scripted/CI contexts where you are certain.
#
set -euo pipefail

SCRIPT_ROOT="$(dirname "$0")"
source "${SCRIPT_ROOT}/../.env.deploy"

CONFIRM=0
for arg in "$@"; do
  [[ "$arg" == "--confirm" ]] && CONFIRM=1
done

if [[ $CONFIRM -eq 0 ]]; then
  echo "WARNING: This will OVERWRITE the production database with your local copy."
  echo "All production data added since your last db:pull will be lost."
  echo ""
  read -r -p "Type \"yes\" to continue: " answer
  if [[ "$answer" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

set -x

ssh -i "${EC2_KEY}" "ec2-user@${EC2_IP}" 'pm2 stop jobman-api'

rsync -avz \
  -e "ssh -i ${EC2_KEY}" \
  "${SCRIPT_ROOT}/../jobman.db" \
  "ec2-user@${EC2_IP}:/opt/jobman/backend/jobman.db"

ssh -i "${EC2_KEY}" "ec2-user@${EC2_IP}" 'pm2 start jobman-api'
