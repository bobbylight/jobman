#!/usr/bin/env bash
#
# deploy-backend.sh - Deploys the backend to an EC2 instance.
#
# Usage:
#  ./scripts/deploy-backend.sh
#
# Setup:
#   Define the following in your environment somehow:
#     * $EC2_IP  - IP address of your EC2 instance
#     * $EC2_KEY - full path to private key pem file
#
set -euox pipefail

SCRIPT_ROOT="$(dirname "$0")"
source "${SCRIPT_ROOT}/../.env.deploy"

rsync -avz \
  --exclude node_modules \
  --exclude '*.spec.*' \
  --exclude coverage \
  --exclude '.env*' \
  --exclude 'vitest.config.ts' \
  -e "ssh -i ${EC2_KEY}" \
  "${SCRIPT_ROOT}/../" ec2-user@${EC2_IP}:/opt/jobman/backend

ssh -i "${EC2_KEY}" "ec2-user@${EC2_IP}" \
  'cd /opt/jobman/backend && npm install --omit=dev && (pm2 restart jobman-api || pm2 start --name jobman-api bash -- /opt/jobman/backend/scripts/start-production.sh)'
