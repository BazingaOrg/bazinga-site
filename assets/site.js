import { trackUmami } from './umami.js'
import { initSakuraFall } from './sakura-fall.js'

if ('share' in navigator) {
  for (const shareButton of document.querySelectorAll('[data-share-url]')) {
    shareButton.hidden = false
    shareButton.addEventListener('click', event => {
      const url = shareButton.getAttribute('data-share-url')
      navigator.share({url}).then(() => {
        trackUmami('share_native', {
          shared_url: url,
          source_page: window.location.pathname,
          page_type: document.body.dataset.pageType || 'default',
          language: document.documentElement.lang || 'en-US'
        })
      }).catch(() => {
        // User cancelled share or the action failed; no tracking needed
      })
    })
  }
}

initSakuraFall()

// 密码显示/隐藏切换功能
function initPasswordToggle() {
  const passwordWrappers = document.querySelectorAll('.password-field-wrapper')

  passwordWrappers.forEach(wrapper => {
    const input = wrapper.querySelector('input[type="password"], input[type="text"]')
    const toggle = wrapper.querySelector('.password-toggle')

    if (!input || !toggle) return

    toggle.addEventListener('click', () => {
      const isPassword = input.type === 'password'
      input.type = isPassword ? 'text' : 'password'

      const eyeIcon = toggle.querySelector('.eye-icon')
      const eyeSlashIcon = toggle.querySelector('.eye-slash-icon')

      if (isPassword) {
        eyeIcon.style.display = 'none'
        eyeSlashIcon.style.display = 'block'
      } else {
        eyeIcon.style.display = 'block'
        eyeSlashIcon.style.display = 'none'
      }

      toggle.setAttribute('aria-label', isPassword ? '隐藏密码' : '显示密码')
    })
  })
}

// 初始化密码切换功能
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPasswordToggle)
} else {
  initPasswordToggle()
}
