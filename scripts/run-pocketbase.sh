#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ -f ".env.bot" ]; then
  set -a
  . ./.env.bot
  set +a
fi

exec ./pb serve --http=127.0.0.1:8090
