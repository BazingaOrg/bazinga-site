#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

extract_frontmatter_value() {
  local file_path="$1"
  local key="$2"

  awk -v key="$key" '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter {
      split($0, parts, ":")
      if (parts[1] == key) {
        sub("^[^:]+:[[:space:]]*", "", $0)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
        print $0
        exit
      }
    }
  ' "$file_path"
}

declare -a ROUTE_PAIRS=(
  "index.html:index-zh-CN.html:/:/zh-CN/"
  "notes.html:notes-zh-CN.html:/notes/:/zh-CN/notes/"
  "photos.html:photos-zh-CN.html:/photos/:/zh-CN/photos/"
  "film.html:film-zh-CN.html:/film/:/zh-CN/film/"
  "write-note.html:write-note-zh-CN.html:/write-note/:/zh-CN/write-note/"
  "write-post.html:write-post-zh-CN.html:/write-post/:/zh-CN/write-post/"
  "write-photo.html:write-photo-zh-CN.html:/write-photo/:/zh-CN/write-photo/"
  "write-film.html:write-film-zh-CN.html:/write-film/:/zh-CN/write-film/"
)

has_errors=0

for pair in "${ROUTE_PAIRS[@]}"; do
  IFS=':' read -r en_file zh_file expected_en_path expected_zh_path <<<"$pair"

  if [[ ! -f "$en_file" ]]; then
    echo "Missing EN file: $en_file"
    has_errors=1
    continue
  fi

  if [[ ! -f "$zh_file" ]]; then
    echo "Missing ZH file: $zh_file"
    has_errors=1
    continue
  fi

  en_permalink="$(extract_frontmatter_value "$en_file" "permalink")"
  zh_permalink="$(extract_frontmatter_value "$zh_file" "permalink")"
  zh_lang="$(extract_frontmatter_value "$zh_file" "lang")"

  if [[ "$expected_en_path" == "/" ]]; then
    if [[ -n "$en_permalink" && "$en_permalink" != "/" ]]; then
      echo "Unexpected EN permalink in $en_file: '$en_permalink' (expected '/' or omitted)"
      has_errors=1
    fi
  elif [[ "$en_permalink" != "$expected_en_path" ]]; then
    echo "Unexpected EN permalink in $en_file: '$en_permalink' (expected '$expected_en_path')"
    has_errors=1
  fi

  if [[ "$zh_permalink" != "$expected_zh_path" ]]; then
    echo "Unexpected ZH permalink in $zh_file: '$zh_permalink' (expected '$expected_zh_path')"
    has_errors=1
  fi

  if [[ "$zh_lang" != "zh-CN" ]]; then
    echo "Unexpected lang in $zh_file: '$zh_lang' (expected 'zh-CN')"
    has_errors=1
  fi
done

if [[ "$has_errors" -eq 1 ]]; then
  echo "Language route smoke test failed."
  exit 1
fi

echo "Language route smoke test passed."
