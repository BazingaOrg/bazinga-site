# site.bazinga.ink

Code for https://site.bazinga.ink/.

## Technology

- HTML, CSS, Anti-JavaScript JavaScript
- [RSS](https://en.wikipedia.org/wiki/RSS)
- [Jekyll](https://jekyllrb.com/)
- [OpenStories](https://github.com/dddddddddzzzz/OpenStories), [`<open-stories>`](https://github.com/dddddddddzzzz/open-stories-element)
- [OpenHeart](https://github.com/dddddddddzzzz/OpenHeart), [`<open-heart>`](https://github.com/dddddddddzzzz/open-heart-element)

## Development

Requires a Ruby environment.

```
$ ./start
```

### Verification

```bash
# Quick local gate (checks + production build)
npm run test:quick

# Full gate (quick gate + performance snapshot)
npm run test:full
```

### Optional local git hook

```bash
# Install pre-push hook that runs test:quick
npm run hooks:install
```

## Deployment

This site is configured for deployment on Vercel. The Jekyll build process is handled automatically.

Build command includes vendor synchronization before Jekyll build.

## Documentation

Contributor-facing guides are kept in the repository root (for example, `AGENTS.md` and `DEPLOYMENT.md`).

## License

The following directories and their contents are Copyright Bazinga. You may not reuse anything therein without permission:

```
_data/
_posts/
_stories/
_notes/
images/
```

All other directories and files are MIT Licensed (where applicable).
