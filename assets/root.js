import { trackUmami } from './umami.js'

function settime() {
  const timestamp = document.querySelector('[data-timestamp-text]')
  if (!timestamp || !('Intl' in window)) return

  const options = {
    timeZone: "Asia/Shanghai",
    timeStyle: "short",
    hour12: false
  }

  // https://gist.github.com/muan/e7414b6241f088090acd916ed965540e
  let time = new Intl.DateTimeFormat(navigator.language || "zh-CN", options).format(new Date())

  // Setting interpolated string instead of just the time because
  // if there's no JS there should be no mentions of current time
  const text = timestamp.getAttribute('data-timestamp-text').replace('{time}', time)
  timestamp.innerHTML = text.replace(':', '<span class="timestamp-colon" data-colon>:</span>')

  const now = new Date()
  const sec = now.getSeconds()
  const secondIsEven = sec % 2 === 0
  const colon = document.querySelector('[data-colon]')
  if (colon) colon.style.animationDelay = `${(secondIsEven ? 0 : 1000) - now.getMilliseconds()}ms`

  const delay = 60000 - ((sec * 1000) + now.getMilliseconds())
  setTimeout(settime, delay)
}

settime()

// Language preference memory functionality
function initLanguageMemory() {
  const STORAGE_KEY = 'site-language-preference'
  const currentPath = window.location.pathname
  const isChinesePage = currentPath.startsWith('/zh-CN/')
  const isEnglishPage = currentPath === '/' || (!currentPath.startsWith('/zh-CN/') && !currentPath.includes('zh-CN'))
  
  // Enhanced function to detect browser preferred language with better accuracy
  function getBrowserPreferredLanguage() {
    // Get all browser languages in preference order
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage || 'en-US']
    
    // Check each language in order of preference
    for (const lang of browserLanguages) {
      // Normalize language code
      const normalizedLang = lang.toLowerCase()
      
      // Check for Chinese variants (Simplified, Traditional, regional)
      if (normalizedLang.startsWith('zh-cn') ||     // Simplified Chinese (China)
          normalizedLang.startsWith('zh-sg') ||     // Simplified Chinese (Singapore)  
          normalizedLang.startsWith('zh-hans') ||   // Simplified Chinese
          normalizedLang === 'zh') {                // Generic Chinese (assume Simplified)
        return 'zh-CN'
      }
      
      // Check for Traditional Chinese (prefer English over Traditional for this site)
      if (normalizedLang.startsWith('zh-tw') ||     // Traditional Chinese (Taiwan)
          normalizedLang.startsWith('zh-hk') ||     // Traditional Chinese (Hong Kong)
          normalizedLang.startsWith('zh-mo') ||     // Traditional Chinese (Macau)
          normalizedLang.startsWith('zh-hant')) {   // Traditional Chinese
        return 'en-US'
      }
    }
    
    return 'en-US'
  }
  
  // Enhanced first-time visit detection
  function isFirstTimeVisitor() {
    return !localStorage.getItem(STORAGE_KEY) && !sessionStorage.getItem('visited-before')
  }
  
  // Mark user as having visited the site
  function markAsVisited() {
    sessionStorage.setItem('visited-before', 'true')
  }
  
  // Check if user has been redirected to avoid infinite loops
  const hasBeenRedirected = sessionStorage.getItem('language-redirected')
  
  // Enhanced auto-redirect logic for first-time visitors
  if (!hasBeenRedirected && (currentPath === '/' || currentPath === '/zh-CN/')) {
    const savedLanguage = localStorage.getItem(STORAGE_KEY)
    
    if (isFirstTimeVisitor()) {
      // First-time visitor: use browser language detection
      const browserPreferredLanguage = getBrowserPreferredLanguage()
      
      markAsVisited()
      
      if (browserPreferredLanguage === 'zh-CN' && currentPath === '/') {
        trackUmami('language_autoredirect', {
          reason: 'browser_preference',
          detected_language: browserPreferredLanguage,
          from_path: currentPath,
          to_path: '/zh-CN/'
        })
        sessionStorage.setItem('language-redirected', 'true')
        setTimeout(() => {
          window.location.href = '/zh-CN/'
        }, 0)
        return
      } else if (browserPreferredLanguage === 'en-US' && currentPath === '/zh-CN/') {
        trackUmami('language_autoredirect', {
          reason: 'browser_preference',
          detected_language: browserPreferredLanguage,
          from_path: currentPath,
          to_path: '/'
        })
        sessionStorage.setItem('language-redirected', 'true')
        setTimeout(() => {
          window.location.href = '/'
        }, 0)
        return
      }
    } else if (savedLanguage) {
      if (savedLanguage === 'zh-CN' && currentPath === '/') {
        trackUmami('language_autoredirect', {
          reason: 'saved_preference',
          saved_language: savedLanguage,
          from_path: currentPath,
          to_path: '/zh-CN/'
        })
        sessionStorage.setItem('language-redirected', 'true')
        setTimeout(() => {
          window.location.href = '/zh-CN/'
        }, 0)
        return
      } else if (savedLanguage === 'en-US' && currentPath === '/zh-CN/') {
        trackUmami('language_autoredirect', {
          reason: 'saved_preference',
          saved_language: savedLanguage,
          from_path: currentPath,
          to_path: '/'
        })
        sessionStorage.setItem('language-redirected', 'true')
        setTimeout(() => {
          window.location.href = '/'
        }, 0)
        return
      }
    }
  }
  
  // Save current language preference based on current page
  if (isChinesePage) {
    localStorage.setItem(STORAGE_KEY, 'zh-CN')
  } else if (isEnglishPage) {
    localStorage.setItem(STORAGE_KEY, 'en-US')
  }
  
  // Add click event listeners to language switcher links
  const langSwitcher = document.querySelector('.lang')
  if (langSwitcher) {
    const langLinks = langSwitcher.querySelectorAll('a')
    
    langLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        // Clear the redirect flag so next visit respects the new choice
        sessionStorage.removeItem('language-redirected')
        
        // Save the language preference based on the clicked link
        const targetHref = this.getAttribute('href')
        if (targetHref === '/zh-CN/') {
          localStorage.setItem(STORAGE_KEY, 'zh-CN')
        } else if (targetHref === '/') {
          localStorage.setItem(STORAGE_KEY, 'en-US')
        }
      })
    })
  }
}

// Write Note 入口显隐控制
function initWriteEntryControl() {
  const headings = Array.from(document.querySelectorAll('.normal-heading'))

  const logEntryToggle = (entry, action) => {
    trackUmami('write_entry_toggle', {
      entry,
      action,
      language: document.documentElement.lang || 'en-US',
      current_page: window.location.pathname
    })
  }

  function resolveHeadings(candidates) {
    return headings.filter(heading => candidates.includes(heading.textContent.trim()))
  }

  function bindTitleInteractions(targetHeadings, onToggle, updateTitleHint) {
    targetHeadings.forEach(targetHeading => {
      targetHeading.addEventListener('dblclick', event => {
        event.preventDefault()
        onToggle()
      })

      let pressTimer = null
      let isLongPress = false

      targetHeading.addEventListener('touchstart', event => {
        isLongPress = false
        pressTimer = setTimeout(() => {
          isLongPress = true
          event.preventDefault()
          onToggle()
        }, 1500)
      })

      targetHeading.addEventListener('touchend', event => {
        clearTimeout(pressTimer)
        if (isLongPress) {
          event.preventDefault()
        }
      })

      targetHeading.addEventListener('touchmove', () => {
        clearTimeout(pressTimer)
      })

      targetHeading.style.cursor = 'pointer'
      updateTitleHint(targetHeading)
    })
  }

  function createWriteEntryController(config) {
    const {
      entryId,
      storageKey,
      headingTexts,
      activeTitle,
      inactiveTitle,
      activeMessage,
      inactiveMessage,
      trackingEntry
    } = config

    const entryElement = document.getElementById(entryId)
    if (!entryElement) return

    const targetHeadings = resolveHeadings(headingTexts)
    if (targetHeadings.length === 0) return

    if (localStorage.getItem(storageKey) === 'true') {
      entryElement.classList.add('show')
    }

    const updateTitleHint = titleElement => {
      const isActive = localStorage.getItem(storageKey) === 'true'
      const isMobile = window.innerWidth <= 768
      const action = isMobile ? '长按' : '双击'
      titleElement.title = isActive ? `${action}${activeTitle}` : `${action}${inactiveTitle}`
    }

    const activateEntry = () => {
      entryElement.classList.add('show')
      localStorage.setItem(storageKey, 'true')
      entryElement.style.animation = 'writeEntryAppear 0.6s ease-out'
      showToast(activeMessage, 'success')
      logEntryToggle(trackingEntry, 'show')
    }

    const hideEntry = () => {
      entryElement.style.animation = 'writeEntryDisappear 0.4s ease-in'
      setTimeout(() => {
        entryElement.classList.remove('show')
        localStorage.setItem(storageKey, 'false')
      }, 400)
      showToast(inactiveMessage, 'info')
      logEntryToggle(trackingEntry, 'hide')
    }

    const toggleEntry = () => {
      if (entryElement.classList.contains('show')) {
        hideEntry()
      } else {
        activateEntry()
      }
      targetHeadings.forEach(updateTitleHint)
    }

    bindTitleInteractions(targetHeadings, toggleEntry, updateTitleHint)
  }

  createWriteEntryController({
    entryId: 'write-entry',
    storageKey: 'show-write-entry',
    headingTexts: ['Notes'],
    activeTitle: '隐藏写作入口',
    inactiveTitle: '激活写作模式',
    activeMessage: '✏️ 写作模式已激活',
    inactiveMessage: '📝 写作模式已隐藏',
    trackingEntry: 'notes'
  })

  createWriteEntryController({
    entryId: 'photo-write-entry',
    storageKey: 'show-photo-entry',
    headingTexts: ['Photos', '照片'],
    activeTitle: '隐藏上传入口',
    inactiveTitle: '激活照片上传',
    activeMessage: '📷 照片上传已激活',
    inactiveMessage: '📸 照片上传已隐藏',
    trackingEntry: 'photos'
  })

  createWriteEntryController({
    entryId: 'film-write-entry',
    storageKey: 'show-film-entry',
    headingTexts: ['Film photos', '胶片照片'],
    activeTitle: '隐藏胶片入口',
    inactiveTitle: '激活胶片入口',
    activeMessage: '🎞️ 胶片入口已激活',
    inactiveMessage: '📽️ 胶片入口已隐藏',
    trackingEntry: 'film'
  })

  createWriteEntryController({
    entryId: 'post-write-entry',
    storageKey: 'show-post-entry',
    headingTexts: ['Recent posts', '文章'],
    activeTitle: '隐藏文章入口',
    inactiveTitle: '激活文章入口',
    activeMessage: '📰 文章入口已激活',
    inactiveMessage: '🗞️ 文章入口已隐藏',
    trackingEntry: 'posts'
  })

  function showToast(message, type) {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    // 显示动画
    requestAnimationFrame(() => {
      toast.classList.add('show')
    })

    // 2秒后自动消失
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 2000)
  }
}

// 在语言内存初始化后初始化写作入口控制
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initLanguageMemory()
    initWriteEntryControl()
    initYearTimeline()
  })
} else {
  initLanguageMemory()
  initWriteEntryControl()
  initYearTimeline()
}

// 年度GitHub风格贡献热力图初始化
function initYearTimeline() {
  const timelineContainer = document.getElementById('year-timeline')
  if (!timelineContainer || !window.timelineData) return
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const endOfYear = new Date(currentYear + 1, 0, 1)
  
  // 将时间轴数据转换为按日期索引的哈希表，提升查询效率
  const dataByDate = {}
  window.timelineData.forEach(day => {
    dataByDate[day.date] = day
  })
  
  // 创建贡献网格
  const grid = document.createElement('div')
  grid.className = 'year-timeline-grid'
  
  // 计算起始日期：从年初的第一个星期天开始（GitHub风格）
  let currentDate = new Date(startOfYear)
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1)
  }
  
  // 生成一年的贡献网格（按周排列）
  while (currentDate < endOfYear) {
    const week = document.createElement('div')
    week.className = 'year-timeline-week'
    
    // 每周7天
    for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
      const dayElement = document.createElement('div')
      dayElement.className = 'year-timeline-day'
      
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // 只处理当前年份内的日期
      if (currentDate.getFullYear() === currentYear) {
        // 获取该日期的活跃度数据
        const dayData = dataByDate[dateStr]
        const activityLevel = dayData ? dayData.level : 0
        const contributionCount = dayData ? dayData.count : 0
        
        // 设置数据属性
        dayElement.setAttribute('data-level', activityLevel)
        dayElement.setAttribute('data-count', contributionCount)
        dayElement.setAttribute('data-date', dateStr)
        
        // 添加鼠标悬停提示
        const dateFormatted = currentDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
        const contributionText = contributionCount === 1 ? 'contribution' : 'contributions'
        dayElement.title = `${contributionCount} ${contributionText} on ${dateFormatted}`
      }
      
      week.appendChild(dayElement)
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    grid.appendChild(week)
  }
  
  // 计算年度统计
  const totalContributions = window.timelineData.reduce((sum, day) => sum + day.count, 0)
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1
  const totalDays = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24))
  const progressPercentage = (((totalDays - dayOfYear + 1) / totalDays) * 100).toFixed(1)
  
  // 创建底部信息显示
  const info = document.createElement('div')
  info.className = 'year-timeline-info'
  info.innerHTML = `
    <span class="year">${currentYear}</span>
    <span class="contributions">${totalContributions} contributions</span>
    <span class="progress">${progressPercentage}% left</span>
  `
  
  // 添加到主容器
  timelineContainer.appendChild(grid)
  timelineContainer.appendChild(info)

  const logTimelineInteraction = (interaction, element) => {
    const date = element.getAttribute('data-date')
    if (!date) return

    trackUmami('year_timeline_interaction', {
      interaction,
      date,
      activity_level: element.getAttribute('data-level'),
      contribution_count: element.getAttribute('data-count'),
      language: document.documentElement.lang || 'en-US',
      current_page: window.location.pathname
    })
  }

  timelineContainer.addEventListener('click', event => {
    const day = event.target.closest('.year-timeline-day')
    if (day && timelineContainer.contains(day)) {
      logTimelineInteraction('click', day)
    }
  })

  timelineContainer.addEventListener('focusin', event => {
    const day = event.target.closest('.year-timeline-day')
    if (day && timelineContainer.contains(day)) {
      logTimelineInteraction('focus', day)
    }
  })
}
