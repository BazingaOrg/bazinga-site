# Repository Guidelines

## Project Structure & Module Organization
Content lives in Jekyll collections: `_posts/` for long-form articles, `_notes/` for quick updates, and `_stories/` for narrative entries. Layouts reside under `_layouts/`, shared partials in `_includes/`, while standalone pages live in `_pages/`. Static assets sit in `assets/` (`assets/new.scss`, `assets/site.js`, `assets/root.js`). Generated data (photos, feeds, etc.) is stored in `_data/` and `feeds/`. The build output `_site/` is disposable—never edit it directly.

## Build, Test, and Development Commands
- `bundle install`: install Ruby gems defined in `Gemfile`.
- `./start`: launch the local preview (`bundle exec jekyll server -w --future`).
- `bundle exec jekyll serve --host 0.0.0.0 --port 3000`: custom host/port preview.
- `bundle exec jekyll build`: produce a production build for verification.

## Coding Style & Naming Conventions
Use 2-space indentation for HTML/Liquid, SCSS, YAML, and JSON. Front matter keys stay lowercase (`title`, `date`, `tags`). Posts follow `_posts/YYYY-MM-DD-slug.md`; notes use `_notes/YYYY-MM-DD-slug.md`. Prefer descriptive filenames and avoid spaces. CSS lives in SCSS files; keep variables and mixins scoped logically.

## Testing Guidelines
No automated test suite exists. After changes, run `bundle exec jekyll build` and manually review key routes (home, `/notes/`, `/photos/`, feeds like `/feed.xml`). Spot-check note/post pages for layout regressions and confirm external embeds still load.

## Commit & Pull Request Guidelines
Adopt Conventional Commits when practical (`feat:`, `fix:`, `docs:`, `chore:`). Each commit should focus on one logical change set. Pull requests must include: summary of changes, manual verification steps (e.g., build + page checks), linked issues when relevant, and before/after screenshots for UI tweaks. Keep PR scope tight—avoid mixing structural refactors with content edits.

## Security & Configuration Tips
Do not commit secrets or API tokens. Review `_config.yml` carefully before toggling deployment-related settings. GitHub Actions may write to `_stories/` and `_data/`; test those flows locally prior to altering related scripts.
