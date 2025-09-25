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

const statusEl = document.querySelector('[data-status-loading]')

if (statusEl) {
  try {
    statusEl.hidden = false
    // Status functionality disabled for now
    statusEl.remove()
  } catch (e) {
    statusEl.remove()
    console.warn(e)
  }
}

function relativeDate(date) {
  const now = new Date()
  const diff = now - date
  const hour = 1000 * 60 * 60
  const day = hour * 24
  const week = day * 7
  const rtf = new Intl.RelativeTimeFormat('en', { style: 'narrow' })

  if (diff < hour) {
    return rtf.format(-Math.floor(diff / 60000), 'minute')
  } else if (diff < day) {
    return rtf.format(-Math.floor(diff / hour), 'hour')
  } else if (diff < week) {
    return rtf.format(-Math.floor(diff / day), 'day')
  } else {
    return
  }
}

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

// Initialize language memory when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguageMemory)
} else {
  initLanguageMemory()
}

// Write Note 入口显隐控制
function initWriteEntryControl() {
  const writeEntry = document.getElementById('write-entry')
  if (!writeEntry) return
  
  const logEntryToggle = (entry, action) => {
    trackUmami('write_entry_toggle', {
      entry,
      action,
      language: document.documentElement.lang || 'en-US',
      current_page: window.location.pathname
    })
  }

  // 检查是否已激活
  if (localStorage.getItem('show-write-entry') === 'true') {
    writeEntry.classList.add('show')
  }
  
  // 找到Notes标题进行交互监听
  const notesHeadings = Array.from(document.querySelectorAll('.normal-heading')).filter(h => 
    h.textContent.trim() === 'Notes'
  )
  
  notesHeadings.forEach(notesTitle => {
    // 桌面端：双击事件
    notesTitle.addEventListener('dblclick', (e) => {
      e.preventDefault()
      toggleWriteEntry()
    })
    
    // 移动端：长按事件
    let pressTimer = null
    let isLongPress = false
    
    notesTitle.addEventListener('touchstart', (e) => {
      isLongPress = false
      pressTimer = setTimeout(() => {
        isLongPress = true
        e.preventDefault()
        toggleWriteEntry()
      }, 1500) // 1.5秒长按
    })
    
    notesTitle.addEventListener('touchend', (e) => {
      clearTimeout(pressTimer)
      if (isLongPress) {
        e.preventDefault()
      }
    })
    
    notesTitle.addEventListener('touchmove', () => {
      clearTimeout(pressTimer)
    })
    
    // 添加提示样式
    notesTitle.style.cursor = 'pointer'
    updateTitleHint(notesTitle)
  })
  
  function updateTitleHint(titleElement) {
    const isActive = localStorage.getItem('show-write-entry') === 'true'
    const isMobile = window.innerWidth <= 768
    const action = isMobile ? '长按' : '双击'
    titleElement.title = isActive ? `${action}隐藏写作入口` : `${action}激活写作模式`
  }
  
  function toggleWriteEntry() {
    const isCurrentlyActive = writeEntry.classList.contains('show')
    
    if (isCurrentlyActive) {
      // 隐藏入口
      hideWriteEntry()
    } else {
      // 激活入口
      activateWriteEntry()
    }
    
    // 更新所有Notes标题的提示
    notesHeadings.forEach(updateTitleHint)
  }

  // Photos 标题交互逻辑
  const photoEntry = document.getElementById('photo-write-entry')
  if (photoEntry) {
    // 检查localStorage中的Photos写作入口状态
    if (localStorage.getItem('show-photo-entry') === 'true') {
      photoEntry.classList.add('show')
    }

    // 找到Photos标题进行交互监听
    const photosHeadings = Array.from(document.querySelectorAll('.normal-heading')).filter(h =>
      h.textContent.trim() === 'Photos' || h.textContent.trim() === '照片'
    )

    photosHeadings.forEach(photosTitle => {
      // 桌面端：双击事件
      photosTitle.addEventListener('dblclick', (e) => {
        e.preventDefault()
        togglePhotoEntry()
      })

      // 移动端：长按事件
      let photoPressTimer = null
      let isPhotoLongPress = false

      photosTitle.addEventListener('touchstart', (e) => {
        isPhotoLongPress = false
        photoPressTimer = setTimeout(() => {
          isPhotoLongPress = true
          e.preventDefault()
          togglePhotoEntry()
        }, 1500) // 1.5秒长按
      })

      photosTitle.addEventListener('touchend', (e) => {
        clearTimeout(photoPressTimer)
        if (isPhotoLongPress) {
          e.preventDefault()
        }
      })

      photosTitle.addEventListener('touchmove', () => {
        clearTimeout(photoPressTimer)
      })

      // 添加提示样式
      photosTitle.style.cursor = 'pointer'
      updatePhotoTitleHint(photosTitle)
    })

    function updatePhotoTitleHint(titleElement) {
      const isActive = localStorage.getItem('show-photo-entry') === 'true'
      const isMobile = window.innerWidth <= 768
      const action = isMobile ? '长按' : '双击'
      titleElement.title = isActive ? `${action}隐藏上传入口` : `${action}激活照片上传`
    }

    function togglePhotoEntry() {
      const isCurrentlyActive = photoEntry.classList.contains('show')

      if (isCurrentlyActive) {
        // 隐藏入口
        hidePhotoEntry()
      } else {
        // 激活入口
        activatePhotoEntry()
      }

      // 更新所有Photos标题的提示
      photosHeadings.forEach(updatePhotoTitleHint)
    }

  function activatePhotoEntry() {
    photoEntry.classList.add('show')
    localStorage.setItem('show-photo-entry', 'true')
    photoEntry.style.animation = 'writeEntryAppear 0.6s ease-out'
    showToast('📷 照片上传已激活', 'success')
    logEntryToggle('photos', 'show')
  }

  function hidePhotoEntry() {
    photoEntry.style.animation = 'writeEntryDisappear 0.4s ease-in'
    setTimeout(() => {
      photoEntry.classList.remove('show')
      localStorage.setItem('show-photo-entry', 'false')
    }, 400)
    showToast('📸 照片上传已隐藏', 'info')
    logEntryToggle('photos', 'hide')
  }
  }

  // Film photos 标题交互逻辑
  const filmEntry = document.getElementById('film-write-entry')
  if (filmEntry) {
    if (localStorage.getItem('show-film-entry') === 'true') {
      filmEntry.classList.add('show')
    }

    const filmHeadings = Array.from(document.querySelectorAll('.normal-heading')).filter(h =>
      h.textContent.trim() === 'Film photos' || h.textContent.trim() === '胶片照片'
    )

    filmHeadings.forEach(filmTitle => {
      filmTitle.addEventListener('dblclick', (e) => {
        e.preventDefault()
        toggleFilmEntry()
      })

      let filmPressTimer = null
      let isFilmLongPress = false

      filmTitle.addEventListener('touchstart', (e) => {
        isFilmLongPress = false
        filmPressTimer = setTimeout(() => {
          isFilmLongPress = true
          e.preventDefault()
          toggleFilmEntry()
        }, 1500)
      })

      filmTitle.addEventListener('touchend', (e) => {
        clearTimeout(filmPressTimer)
        if (isFilmLongPress) {
          e.preventDefault()
        }
      })

      filmTitle.addEventListener('touchmove', () => {
        clearTimeout(filmPressTimer)
      })

      filmTitle.style.cursor = 'pointer'
      updateFilmTitleHint(filmTitle)
    })

    function updateFilmTitleHint(titleElement) {
      const isActive = localStorage.getItem('show-film-entry') === 'true'
      const isMobile = window.innerWidth <= 768
      const action = isMobile ? '长按' : '双击'
      titleElement.title = isActive ? `${action}隐藏胶片入口` : `${action}激活胶片入口`
    }

    function toggleFilmEntry() {
      const isCurrentlyActive = filmEntry.classList.contains('show')

      if (isCurrentlyActive) {
        hideFilmEntry()
      } else {
        activateFilmEntry()
      }

      filmHeadings.forEach(updateFilmTitleHint)
    }

    function activateFilmEntry() {
      filmEntry.classList.add('show')
      localStorage.setItem('show-film-entry', 'true')
      filmEntry.style.animation = 'writeEntryAppear 0.6s ease-out'
      showToast('🎞️ 胶片入口已激活', 'success')
      logEntryToggle('film', 'show')
    }

    function hideFilmEntry() {
      filmEntry.style.animation = 'writeEntryDisappear 0.4s ease-in'
      setTimeout(() => {
        filmEntry.classList.remove('show')
        localStorage.setItem('show-film-entry', 'false')
      }, 400)
      showToast('📽️ 胶片入口已隐藏', 'info')
      logEntryToggle('film', 'hide')
    }
  }

  const postEntry = document.getElementById('post-write-entry')
  if (postEntry) {
    if (localStorage.getItem('show-post-entry') === 'true') {
      postEntry.classList.add('show')
    }

    const postHeadings = Array.from(document.querySelectorAll('.normal-heading')).filter(h =>
      h.textContent.trim() === 'Recent posts' || h.textContent.trim() === '文章'
    )

    postHeadings.forEach(postTitle => {
      postTitle.addEventListener('dblclick', (e) => {
        e.preventDefault()
        togglePostEntry()
      })

      let postPressTimer = null
      let isPostLongPress = false

      postTitle.addEventListener('touchstart', (e) => {
        isPostLongPress = false
        postPressTimer = setTimeout(() => {
          isPostLongPress = true
          e.preventDefault()
          togglePostEntry()
        }, 1500)
      })

      postTitle.addEventListener('touchend', (e) => {
        clearTimeout(postPressTimer)
        if (isPostLongPress) {
          e.preventDefault()
        }
      })

      postTitle.addEventListener('touchmove', () => {
        clearTimeout(postPressTimer)
      })

      postTitle.style.cursor = 'pointer'
      updatePostTitleHint(postTitle)
    })

    function updatePostTitleHint(titleElement) {
      const isActive = localStorage.getItem('show-post-entry') === 'true'
      const isMobile = window.innerWidth <= 768
      const action = isMobile ? '长按' : '双击'
      titleElement.title = isActive ? `${action}隐藏文章入口` : `${action}激活文章入口`
    }

    function togglePostEntry() {
      const isCurrentlyActive = postEntry.classList.contains('show')

      if (isCurrentlyActive) {
        hidePostEntry()
      } else {
        activatePostEntry()
      }

      postHeadings.forEach(updatePostTitleHint)
    }

    function activatePostEntry() {
      postEntry.classList.add('show')
      localStorage.setItem('show-post-entry', 'true')
      postEntry.style.animation = 'writeEntryAppear 0.6s ease-out'
      showToast('📰 文章入口已激活', 'success')
      logEntryToggle('posts', 'show')
    }

    function hidePostEntry() {
      postEntry.style.animation = 'writeEntryDisappear 0.4s ease-in'
      setTimeout(() => {
        postEntry.classList.remove('show')
        localStorage.setItem('show-post-entry', 'false')
      }, 400)
      showToast('🗞️ 文章入口已隐藏', 'info')
      logEntryToggle('posts', 'hide')
    }
  }

  function activateWriteEntry() {
    writeEntry.classList.add('show')
    localStorage.setItem('show-write-entry', 'true')
    writeEntry.style.animation = 'writeEntryAppear 0.6s ease-out'
    showToast('✏️ 写作模式已激活', 'success')
    logEntryToggle('notes', 'show')
  }
  
  function hideWriteEntry() {
    writeEntry.style.animation = 'writeEntryDisappear 0.4s ease-in'
    setTimeout(() => {
      writeEntry.classList.remove('show')
      localStorage.setItem('show-write-entry', 'false')
    }, 400)
    showToast('📝 写作模式已隐藏', 'info')
    logEntryToggle('notes', 'hide')
  }
  
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
