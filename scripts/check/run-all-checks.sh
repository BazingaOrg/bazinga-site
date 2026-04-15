#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift

  echo
  echo "==> ${label}"
  "$@"
}

echo "Running project quality checks..."

run_step "Terminology check" bash scripts/check/check-terminology.sh
run_step "i18n key parity check" bash scripts/check/check-i18n-keys.sh
run_step "Language route smoke test" bash scripts/check/check-language-routes.sh
run_step "Jekyll build" bundle exec jekyll build

echo
echo "All checks passed."
