import { trackUmami } from './umami.js'

function readLocalStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn('[site] localStorage unavailable:', error)
    return null
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn('[site] localStorage unavailable:', error)
  }
}

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

import { bubbleCursor } from './cursor-effects.js'

// 页面主题颜色配置
const siteThemeColors = {
  default: { fillColor: "#f0f8ff", strokeColor: "#cccccc" },
  notes: { fillColor: "#f5f5f5", strokeColor: "#999999" },
  photos: { fillColor: "rgba(230,241,247,0.7)", strokeColor: "rgba(58,146,197,0.5)" },
  stories: { fillColor: "#fff8f0", strokeColor: "#ddd" }
}

// 智能加载策略
function initCursorEffects() {
  // 1. 检查设备类型（只在桌面端启用）
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  // 2. 检查用户偏好
  const userDisabled = readLocalStorage('disable-cursor-effects') === 'true'

  // 3. 检查页面类型
  const pageType = document.body.dataset.pageType || 'default'
  const bodyClass = document.body.classList.contains('col-posts') ? 'posts' :
                   document.body.classList.contains('col-notes') ? 'notes' :
                   document.body.classList.contains('col-stories') ? 'stories' : 'default'

  if (!isDesktop || userDisabled) return null

  // 根据页面类型选择颜色主题
  const themeKey = pageType === 'photos' ? 'photos' :
                   bodyClass !== 'default' ? bodyClass : 'default'
  const colors = siteThemeColors[themeKey] || siteThemeColors.default

  const instance = bubbleCursor({
    ...colors,
    zIndex: "999999"
  })

  // 追踪使用情况
  trackUmami('cursor_effect_init', {
    page_type: pageType,
    body_class: bodyClass,
    theme: themeKey
  })

  return instance
}

// 用户控制功能
function toggleCursorEffects() {
  const isDisabled = readLocalStorage('disable-cursor-effects') === 'true'
  writeLocalStorage('disable-cursor-effects', !isDisabled)

  trackUmami('cursor_effect_toggle', {
    action: isDisabled ? 'enable' : 'disable'
  })

  // 刷新页面应用设置（延迟以确保事件成功排队）
  setTimeout(() => {
    window.location.reload()
  }, 150)
}

// 延迟初始化（避免影响首次加载）
let cursorInstance = null
document.addEventListener('mousemove', () => {
  if (!cursorInstance) {
    cursorInstance = initCursorEffects()
  }
}, { once: true })

// 导出控制函数供全局使用
window.toggleCursorEffects = toggleCursorEffects
