#!/usr/bin/env bash
#
# start-production.sh - Wrapper that injects parameters from SSM into the environment,
#   then starts the application. Used in production where we don't use .env files.
#
# Note: This script is run and managed by pm2.
#
# Usage:
#  ./scripts/start-production.sh
#
set -euo pipefail

cd /opt/jobman/backend

# Load all /jobman/* params from SSM as environment variables
while IFS=$'\t' read -r name value; do
  export "${name##*/}=$value"
done < <(aws ssm get-parameters-by-path \
  --path "/jobman" \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameters[*].[Name,Value]' \
  --output text)

exec npm start
