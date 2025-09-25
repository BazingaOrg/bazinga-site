# Repository Guidelines

## Project Structure & Module Organization
Content lives in Jekyll collections: `_posts/` for long-form posts, `_notes/` for short updates, and `_stories/` for narrative pieces created with `uuidgen`. Layouts reside in `_layouts/`, reusable snippets in `_includes/`, and standalone pages in `_pages/`. Static assets go under `assets/` (global styles in `assets/new.scss`, scripts in `assets/site.js` and `assets/root.js`). Structured data sources live in `_data/`, while Atom/RSS feeds are in `feeds/`. Production builds emit to `_site/`, so never edit that directory directly.

## Build, Test, and Development Commands
Install dependencies with `bundle install`. Start local preview via `./start`, which runs `bundle exec jekyll server -w --future`; use `bundle exec jekyll serve --host 0.0.0.0 --port 3000` when you need a specific host/port. Generate a production build with `bundle exec jekyll build`, and sanity-check config issues using `bundle exec jekyll doctor`.

## Coding Style & Naming Conventions
Use 2-space indentation for HTML/Liquid, SCSS, YAML, and JSON. Front matter stays in YAML, wrapped by `---`, with lowercase keys (`title`, `date`, `tags`). Name posts as `_posts/YYYY-MM-DD-title.md`, notes as `_notes/YYYY-MM-DD-title.md`, and stories as `_stories/<uuid>.md`. Keep `_config.yml` authoritative for i18n and collection settings.

## Testing Guidelines
There is no automated test suite. Validate changes by running `bundle exec jekyll build` and reviewing key pages plus feeds like `/feed.xml` and `/photos.xml`. Optionally run `bundle exec jekyll doctor` and spot-check links in the rendered site. Document manual verification steps when submitting changes.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) where practical; English or Chinese summaries are both acceptable. Scope pull requests narrowly, linking issues when relevant. Provide before/after screenshots for UI tweaks and confirm `bundle exec jekyll build` passes locally. Do not mix structural refactors with content edits in the same PR.

## Security & Configuration Tips
Never commit secrets—this is a static site. Review `_config.yml` carefully before altering automation-sensitive settings. GitHub Actions scripts may write into `_data/` and `_stories/`; test those flows locally before changing them.
