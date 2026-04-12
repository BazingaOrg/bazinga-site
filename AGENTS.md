# Repository Guidelines

## Project Structure & Module Organization
This repository is a Jekyll-based personal site. Core content is organized by collection: `_posts/` for long-form articles, `_notes/` for short updates, and `_stories/` for story entries. Shared templates live in `_layouts/` and `_includes/`, while standalone pages are in `_pages/` plus root HTML files like `index.html` and `notes.html`.

Static assets are under `assets/` (notably `assets/new.scss`, `assets/site.js`, and `assets/root.js`). Structured content data is stored in `_data/`, and generated feed files are in `feeds/`. Treat `_site/` as build output only; do not edit files there manually.

## Build, Test, and Development Commands
Use Bundler and Jekyll for local work:

- `bundle install` installs Ruby dependencies from `Gemfile`.
- `./start` runs local preview with watch and future-dated content (`bundle exec jekyll server -w --future`).
- `bundle exec jekyll serve --host 0.0.0.0 --port 3000` starts preview on a custom host/port.
- `bundle exec jekyll build` creates a production build for verification.

## Coding Style & Naming Conventions
Use 2-space indentation for HTML/Liquid, SCSS, YAML, and JSON. Keep front matter keys lowercase (for example: `title`, `date`, `tags`).

Follow naming patterns:

- Posts: `_posts/YYYY-MM-DD-slug.md`
- Notes: `_notes/YYYY-MM-DD-slug.md`

Use descriptive, hyphenated filenames and avoid spaces. Keep CSS changes in SCSS files and group variables/mixins by purpose.

## Testing Guidelines
There is no automated test suite in this repo. Validation is manual:

1. Run `bundle exec jekyll build`.
2. Check key routes locally (`/`, `/notes/`, `/photos/`).
3. Verify feeds such as `/feed.xml` and spot-check a few post/note pages for layout regressions.

## Commit & Pull Request Guidelines
Prefer Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Keep commits focused on one logical change.

PRs should include a clear summary, manual verification steps, linked issues when relevant, and before/after screenshots for visible UI changes. Avoid mixing structural refactors with content edits in one PR.

## Security & Configuration Tips
Never commit secrets or API tokens. Review `_config.yml` carefully before changing deployment-related settings. If modifying workflows that write to `_stories/` or `_data/`, validate behavior locally before merging.
