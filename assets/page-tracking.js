import { trackUmami } from './umami.js'

const trackingScript = document.querySelector('script[data-page-tracking]')

const language =
  trackingScript?.dataset.language ||
  document.documentElement.lang ||
  'en-US'

const pageTitle =
  trackingScript?.dataset.pageTitle ||
  document.title

const pageType =
  trackingScript?.dataset.pageType ||
  'page'

const pageDate =
  trackingScript?.dataset.pageDate ||
  ''

trackUmami('page_meta', {
  language,
  title: pageTitle,
  url: window.location.pathname,
  page_type: pageType,
  page_date: pageDate
}, { scope: 'page-tracking' })

document.addEventListener('click', event => {
  const languageLink = event.target.closest('a[srclang]')
  if (languageLink) {
    trackUmami('language_switch', {
      from_language: language,
      to_language: languageLink.getAttribute('srclang'),
      current_page: window.location.pathname,
      target_page: languageLink.getAttribute('href')
    }, { scope: 'page-tracking' })
  }

  const rssLink = event.target.closest('a[href$=".xml"]')
  if (rssLink) {
    const rssType = rssLink
      .getAttribute('href')
      .replace('.xml', '')
      .replace('/', '')

    trackUmami('rss_click', {
      rss_type: rssType,
      current_page: window.location.pathname,
      language
    }, { scope: 'page-tracking' })
  }

  const noteTag = event.target.closest('.note-tag')
  if (noteTag) {
    const tag = noteTag.getAttribute('data-tag')
    if (tag) {
      trackUmami('tag_click', {
        tag,
        current_page: window.location.pathname,
        language
      }, { scope: 'page-tracking' })
    }
  }

  const photoLink = event.target.closest('.image-link')
  if (photoLink) {
    const photoIdMatch = photoLink.getAttribute('href')?.match(/#P(.+)/)
    if (photoIdMatch) {
      trackUmami('photo_click', {
        photo_id: photoIdMatch[1],
        current_page: window.location.pathname,
        language
      }, { scope: 'page-tracking' })
    }
  }

  const externalLink = event.target.closest('a[href^="http"]:not([href*="site.bazinga.ink"])')
  if (externalLink) {
    trackUmami('external_link_click', {
      destination: externalLink.getAttribute('href'),
      link_text: externalLink.textContent.trim(),
      current_page: window.location.pathname,
      language
    }, { scope: 'page-tracking' })
  }
})
