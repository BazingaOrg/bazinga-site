#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_HOOK="$ROOT_DIR/scripts/git-hooks/pre-push"
TARGET_HOOK="$ROOT_DIR/.git/hooks/pre-push"

if [[ ! -d "$ROOT_DIR/.git" ]]; then
  echo "This script must be run inside a git repository." >&2
  exit 1
fi

if [[ ! -f "$SOURCE_HOOK" ]]; then
  echo "Missing hook template: $SOURCE_HOOK" >&2
  exit 1
fi

if [[ -f "$TARGET_HOOK" ]]; then
  cp "$TARGET_HOOK" "${TARGET_HOOK}.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$SOURCE_HOOK" "$TARGET_HOOK"
chmod +x "$TARGET_HOOK"

echo "Installed pre-push hook: $TARGET_HOOK"
