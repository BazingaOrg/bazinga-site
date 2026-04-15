#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION_FILE="$ROOT_DIR/_data/vendor_versions.json"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Missing version config: $VERSION_FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for parsing $VERSION_FILE" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download vendor assets" >&2
  exit 1
fi

OPEN_HEART_VERSION="$(jq -r '.open_heart_element // empty' "$VERSION_FILE")"
if [[ -z "$OPEN_HEART_VERSION" ]]; then
  echo "open_heart_element version is empty in $VERSION_FILE" >&2
  exit 1
fi

VENDOR_DIR="$ROOT_DIR/assets/vendor"
TARGET_FILE="$VENDOR_DIR/open-heart-element-${OPEN_HEART_VERSION}.js"
TARBALL_URL="https://registry.npmjs.org/open-heart-element/-/open-heart-element-${OPEN_HEART_VERSION}.tgz"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

mkdir -p "$VENDOR_DIR"

echo "Downloading open-heart-element@${OPEN_HEART_VERSION}..."
curl -L -sS "$TARBALL_URL" -o "$tmp_dir/pkg.tgz"
tar -xzf "$tmp_dir/pkg.tgz" -C "$tmp_dir"

SOURCE_FILE="$tmp_dir/package/dist/index.js"
if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Missing expected file in package: dist/index.js" >&2
  exit 1
fi

cp "$SOURCE_FILE" "$TARGET_FILE"

echo "Synced: $TARGET_FILE"
echo "Size: $(wc -c <"$TARGET_FILE" | tr -d ' ') bytes"
