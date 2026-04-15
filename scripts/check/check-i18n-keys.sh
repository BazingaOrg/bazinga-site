#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ruby <<'RUBY'
require 'yaml'

path = '_data/i18n_copy.yml'
data = YAML.load_file(path)
errors = []

unless data.is_a?(Hash)
  puts "Invalid i18n data format in #{path}"
  exit 1
end

data.each do |section_name, section_value|
  next unless section_value.is_a?(Hash)

  en = section_value['en-US']
  zh = section_value['zh-CN']
  next unless en.is_a?(Hash) && zh.is_a?(Hash)

  en_keys = en.keys.map(&:to_s).sort
  zh_keys = zh.keys.map(&:to_s).sort

  missing_zh = en_keys - zh_keys
  missing_en = zh_keys - en_keys

  missing_zh.each do |key|
    errors << "[#{section_name}] missing zh-CN key: #{key}"
  end

  missing_en.each do |key|
    errors << "[#{section_name}] missing en-US key: #{key}"
  end
end

if errors.empty?
  puts 'i18n key parity check passed.'
  exit 0
end

puts 'i18n key parity check failed:'
errors.each { |line| puts "  - #{line}" }
exit 1
RUBY
