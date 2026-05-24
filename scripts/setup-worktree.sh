#!/usr/bin/env bash
set -euo pipefail

# Find the main project root via the shared .git directory
MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir)")

echo "Setting up worktree from main project at: $MAIN_ROOT"

# Symlink .env so OAuth credentials stay in sync with the main project
if [ ! -e backend/.env ]; then
  ln -sf "$MAIN_ROOT/backend/.env" backend/.env
  echo "Linked backend/.env from main project"
else
  echo "backend/.env already exists, skipping"
fi

# Copy the database so the worktree has real data but schema changes are isolated
if [ ! -e backend/jobman.db ]; then
  if [ -f "$MAIN_ROOT/backend/jobman.db" ]; then
    cp "$MAIN_ROOT/backend/jobman.db" backend/jobman.db
    echo "Copied backend/jobman.db from main project"
  else
    echo "No jobman.db found in main project, starting fresh"
  fi
else
  echo "backend/jobman.db already exists, skipping"
fi

npm install

echo ""
echo "Worktree ready. Before running 'npm run dev', make sure no other"
echo "jobman backend is already listening on port 3001."
