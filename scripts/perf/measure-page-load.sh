#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_PATH="${1:-}"

cd "$ROOT_DIR"

JEKYLL_ENV=production bundle exec jekyll build >/tmp/jekyll_perf_build.log

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

declare -a page_specs=(
  "home|/|_site/index.html"
  "notes|/notes/|_site/notes/index.html"
  "photos|/photos/|_site/photos/index.html"
)

rows_json="[]"

for spec in "${page_specs[@]}"; do
  IFS="|" read -r page_key page_route page_file <<<"$spec"

  if [[ ! -f "$page_file" ]]; then
    echo "Missing page file: $page_file" >&2
    exit 1
  fi

  html_bytes="$(wc -c <"$page_file" | tr -d ' ')"
  gzip_bytes="$(gzip -c "$page_file" | wc -c | tr -d ' ')"
  direct_module_count="$(rg -c '<script type="module" src=' "$page_file")"
  direct_assets="$(rg -o '<script type="module" src="/assets/[^"]+"' "$page_file" | sed -E 's/.*src="([^"]+)"/\1/' || true)"

  direct_asset_count=0
  direct_asset_bytes=0
  if [[ -n "$direct_assets" ]]; then
    while IFS= read -r asset_path; do
      [[ -z "$asset_path" ]] && continue
      local_asset_file="_site${asset_path}"
      if [[ -f "$local_asset_file" ]]; then
        asset_bytes="$(wc -c <"$local_asset_file" | tr -d ' ')"
        direct_asset_bytes=$((direct_asset_bytes + asset_bytes))
      fi
      direct_asset_count=$((direct_asset_count + 1))
    done <<<"$direct_assets"
  fi

  deferred_asset_count="$(rg -o '/assets/[a-z0-9-]+\.js' "$page_file" | sort -u | wc -l | tr -d ' ')"
  font_preconnect_count="$(rg -c 'rel="preconnect".*fonts\.(googleapis|gstatic)\.com' "$page_file")"
  open_heart_version=""
  open_heart_cdn_match="$(rg -o 'open-heart-element@[0-9]+\.[0-9]+\.[0-9]+' "$page_file" | head -n 1 || true)"
  open_heart_local_match="$(rg -o 'open-heart-element-[0-9]+\.[0-9]+\.[0-9]+\.js' "$page_file" | head -n 1 || true)"
  if [[ -n "$open_heart_cdn_match" ]]; then
    open_heart_version="${open_heart_cdn_match##*@}"
  elif [[ -n "$open_heart_local_match" ]]; then
    open_heart_version="${open_heart_local_match#open-heart-element-}"
    open_heart_version="${open_heart_version%.js}"
  fi

  row_json="$(jq -n \
    --arg key "$page_key" \
    --arg route "$page_route" \
    --arg file "$page_file" \
    --argjson html_bytes "$html_bytes" \
    --argjson gzip_bytes "$gzip_bytes" \
    --argjson direct_module_count "$direct_module_count" \
    --argjson direct_asset_count "$direct_asset_count" \
    --argjson direct_asset_bytes "$direct_asset_bytes" \
    --argjson deferred_asset_count "$deferred_asset_count" \
    --argjson font_preconnect_count "$font_preconnect_count" \
    --arg open_heart_version "$open_heart_version" \
    '{
      key: $key,
      route: $route,
      file: $file,
      html_bytes: $html_bytes,
      gzip_bytes: $gzip_bytes,
      direct_module_count: $direct_module_count,
      direct_asset_count: $direct_asset_count,
      direct_asset_bytes: $direct_asset_bytes,
      deferred_asset_count: $deferred_asset_count,
      font_preconnect_count: $font_preconnect_count,
      open_heart_version: $open_heart_version
    }')"

  rows_json="$(jq --argjson row "$row_json" '. + [$row]' <<<"$rows_json")"
done

report_json="$(jq -n \
  --arg generated_at "$timestamp" \
  --arg source "JEKYLL_ENV=production bundle exec jekyll build" \
  --argjson pages "$rows_json" \
  '{generated_at: $generated_at, source: $source, pages: $pages}')"

echo "+--------+---------+------------+------------+----------------+-------------------+-----------------+----------------------+---------------------+"
echo "|  Page  |  Route  |  HTML B    |  Gzip B    |  Direct Module |  Direct Asset JS  |  Direct JS B    |  Deferred Asset Ref  |  Open Heart Version |"
echo "+--------+---------+------------+------------+----------------+-------------------+-----------------+----------------------+---------------------+"

jq -r '.pages[] | [
  .key,
  .route,
  (.html_bytes|tostring),
  (.gzip_bytes|tostring),
  (.direct_module_count|tostring),
  (.direct_asset_count|tostring),
  (.direct_asset_bytes|tostring),
  (.deferred_asset_count|tostring),
  (if .open_heart_version == "" then "-" else .open_heart_version end)
] | @tsv' <<<"$report_json" | while IFS=$'\t' read -r page route html_b gzip_b direct_m direct_a direct_js_b deferred_ref oh_version; do
  printf "| %-6s | %-7s | %-10s | %-10s | %-14s | %-17s | %-15s | %-20s | %-19s |\n" \
    "$page" "$route" "$html_b" "$gzip_b" "$direct_m" "$direct_a" "$direct_js_b" "$deferred_ref" "$oh_version"
done

echo "+--------+---------+------------+------------+----------------+-------------------+-----------------+----------------------+---------------------+"
echo
echo "$report_json" | jq .

if [[ -n "$OUTPUT_PATH" ]]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  echo "$report_json" | jq . >"$OUTPUT_PATH"
  echo
  echo "Saved report: $OUTPUT_PATH"
fi
