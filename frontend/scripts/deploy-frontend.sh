#!/usr/bin/env bash
#
# deploy-frontend.sh - Builds and deploys the frontend to S3/CloudFront.
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# Setup:
#   Define the following in your environment somehow:
#     * $S3_BUCKET      - S3 bucket name
#     * $CLOUDFRONT_ID  - CloudFront distribution ID
#
set -euo pipefail

SCRIPT_ROOT="$(dirname "$0")"
source "${SCRIPT_ROOT}/../.env.deploy"

echo "Building frontend..."
npm run build --prefix "${SCRIPT_ROOT}/.."

echo "Syncing to S3..."
aws s3 sync "${SCRIPT_ROOT}/../dist/" "s3://${S3_BUCKET}" --delete --exclude "backups/*"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_ID}" --paths "/*"

echo "Deploy complete."
