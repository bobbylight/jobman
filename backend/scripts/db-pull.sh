#!/usr/bin/env bash
#
# db-pull.sh - Downloads the production database to the local dev copy.
#
# Usage:
#   ./scripts/db-pull.sh
#
set -euox pipefail

SCRIPT_ROOT="$(dirname "$0")"
source "${SCRIPT_ROOT}/../.env.deploy"

rsync -avz \
  -e "ssh -i ${EC2_KEY}" \
  "ec2-user@${EC2_IP}:/opt/jobman/backend/jobman.db" \
  "${SCRIPT_ROOT}/../jobman.db"
