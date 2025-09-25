// 内容浏览页面交互追踪增强
// 与用户旅程分析集成的内容浏览行为追踪

document.addEventListener('DOMContentLoaded', () => {
  // 确保旅程追踪器已加载
  if (!window.journeyTracker) {
    console.warn('Journey tracker not available for content interaction tracking')
    return
  }

  const currentPageType = document.body.getAttribute('data-page-type') || 'page'

  // 笔记页面的标签筛选追踪
  if (currentPageType === 'notes' || window.location.pathname.includes('/notes')) {
    setupNotesPageTracking()
  }

  // 单篇内容页面的阅读追踪
  if (['posts', 'notes', 'stories'].includes(currentPageType)) {
    setupContentReadingTracking()
  }

  // 通用内容交互追踪
  setupGeneralContentTracking()
})

/**
 * 笔记页面追踪设置
 */
function setupNotesPageTracking() {
  const tagCheckboxes = document.querySelectorAll('input[name="tag"]')
  const checkAllButton = document.querySelector('.check-all-tag')
  const noteElements = document.querySelectorAll('.note')

  if (tagCheckboxes.length === 0) return

  let tagFilterUsed = false
  const selectedTags = new Set()

  // 追踪标签筛选行为
  tagCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      tagFilterUsed = true
      const tagName = e.target.value

      if (e.target.checked) {
        selectedTags.add(tagName)
      } else {
        selectedTags.delete(tagName)
      }

      // 延迟追踪以避免频繁事件
      setTimeout(() => {
        const visibleNotes = document.querySelectorAll('.note:not([style*="display: none"])')

        window.journeyTracker.trackConversionGoal('content_filter', {
          filterType: 'tag',
          selectedTags: Array.from(selectedTags),
          totalTags: tagCheckboxes.length,
          visibleContent: visibleNotes.length,
          totalContent: noteElements.length,
          filterEffectiveness: Math.round((visibleNotes.length / noteElements.length) * 100)
        })
      }, 300)
    })
  })

  // 追踪"全选"按钮使用
  if (checkAllButton) {
    checkAllButton.addEventListener('click', () => {
      window.journeyTracker.trackConversionGoal('content_filter_reset', {
        filterType: 'check_all',
        previouslySelectedTags: Array.from(selectedTags),
        totalContent: noteElements.length
      })

      selectedTags.clear()
    })
  }

  // 追踪笔记点击
  noteElements.forEach((note, index) => {
    const noteLink = note.querySelector('a')
    if (noteLink) {
      noteLink.addEventListener('click', (e) => {
        const noteTitle = note.querySelector('h2, h3')?.textContent?.trim() || `Note ${index + 1}`
        const noteTags = Array.from(note.querySelectorAll('.note-tag')).map(tag => tag.textContent.trim())

        window.journeyTracker.trackConversionGoal('content_view', {
          contentType: 'note',
          contentTitle: noteTitle,
          contentTags: noteTags,
          contentIndex: index,
          contentUrl: noteLink.href,
          fromFilteredView: tagFilterUsed
        })
      })
    }
  })
}

/**
 * 单篇内容阅读追踪设置
 */
function setupContentReadingTracking() {
  const contentElement = document.querySelector('.note-content, article, main')
  if (!contentElement) return

  const contentType = document.body.getAttribute('data-page-type') || 'content'
  const contentTitle = document.title
  let readingStartTime = Date.now()
  let totalReadingTime = 0
  let isReading = true

  // 计算阅读预估时间（基于字数）
  const wordCount = contentElement.textContent.trim().split(/\s+/).length
  const estimatedReadingTime = Math.max(1, Math.round(wordCount / 200)) * 60 * 1000 // 假设每分钟200字

  // 追踪阅读开始
  window.journeyTracker.trackConversionGoal('content_reading_start', {
    contentType: contentType,
    contentTitle: contentTitle,
    contentWordCount: wordCount,
    estimatedReadingTime: estimatedReadingTime,
    contentUrl: window.location.pathname
  })

  // 追踪页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isReading) {
        totalReadingTime += Date.now() - readingStartTime
        isReading = false
      }
    } else {
      readingStartTime = Date.now()
      isReading = true
    }
  })

  // 追踪滚动深度里程碑
  const scrollMilestones = [25, 50, 75, 90, 100]
  const reachedMilestones = new Set()

  const trackReadingProgress = () => {
    const scrollTop = window.pageYOffset
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercentage = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 100

    scrollMilestones.forEach(milestone => {
      if (scrollPercentage >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone)

        const currentReadingTime = totalReadingTime + (isReading ? Date.now() - readingStartTime : 0)

        window.journeyTracker.trackConversionGoal('content_reading_progress', {
          contentType: contentType,
          contentTitle: contentTitle,
          scrollPercentage: milestone,
          readingTime: currentReadingTime,
          estimatedProgress: Math.round((currentReadingTime / estimatedReadingTime) * 100),
          contentUrl: window.location.pathname
        })

        // 追踪深度阅读
        if (milestone === 75) {
          window.journeyTracker.trackConversionGoal('content_deep_read', {
            contentType: contentType,
            contentTitle: contentTitle,
            readingTime: currentReadingTime,
            readingEfficiency: currentReadingTime / estimatedReadingTime,
            engagementLevel: 'deep'
          })
        }

        // 追踪完整阅读
        if (milestone === 100) {
          window.journeyTracker.trackConversionGoal('content_complete_read', {
            contentType: contentType,
            contentTitle: contentTitle,
            totalReadingTime: currentReadingTime,
            readingEfficiency: currentReadingTime / estimatedReadingTime,
            engagementLevel: 'complete'
          })
        }
      }
    })
  }

  let scrollTimer = null
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(trackReadingProgress, 200)
  })

  // 初始检查
  trackReadingProgress()

  // 页面卸载时记录最终阅读数据
  window.addEventListener('beforeunload', () => {
    if (isReading) {
      totalReadingTime += Date.now() - readingStartTime
    }

    window.journeyTracker.trackConversionGoal('content_reading_end', {
      contentType: contentType,
      contentTitle: contentTitle,
      totalReadingTime: totalReadingTime,
      maxScrollPercentage: Math.max(...Array.from(reachedMilestones), 0),
      readingCompletionRate: totalReadingTime / estimatedReadingTime,
      engagementQuality: totalReadingTime > estimatedReadingTime * 0.5 ? 'engaged' : 'skimmed'
    })
  })
}

/**
 * 通用内容交互追踪设置
 */
function setupGeneralContentTracking() {
  // 追踪外部链接点击
  document.querySelectorAll('a[href^="http"]:not([href*="site.bazinga.ink"])').forEach(link => {
    link.addEventListener('click', (e) => {
      window.journeyTracker.trackConversionGoal('external_link_click', {
        destinationDomain: new URL(link.href).hostname,
        linkText: link.textContent.trim().substring(0, 100),
        linkHref: link.href,
        currentPage: window.location.pathname,
        context: getClickContext(link)
      })
    })
  })

  // 追踪社交分享（如果有相关链接）
  document.querySelectorAll('a[href*="twitter.com/intent"], a[href*="facebook.com/sharer"], a[href*="weibo.com/share"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const platform = getSocialPlatform(link.href)

      window.journeyTracker.trackConversionGoal('social_share', {
        platform: platform,
        contentType: document.body.getAttribute('data-page-type') || 'page',
        contentTitle: document.title,
        contentUrl: window.location.pathname,
        shareMethod: 'link_click'
      })
    })
  })

  // 追踪复制操作（需要浏览器支持）
  document.addEventListener('copy', (e) => {
    const selectedText = window.getSelection().toString().trim()

    if (selectedText.length > 10) { // 只追踪有意义的复制
      window.journeyTracker.trackConversionGoal('content_copy', {
        contentLength: selectedText.length,
        contentType: document.body.getAttribute('data-page-type') || 'page',
        contentTitle: document.title,
        hasSelection: true,
        currentPage: window.location.pathname
      })
    }
  })

  // 追踪键盘快捷键使用
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + D (书签)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      window.journeyTracker.trackConversionGoal('bookmark_attempt', {
        contentType: document.body.getAttribute('data-page-type') || 'page',
        contentTitle: document.title,
        contentUrl: window.location.pathname,
        method: 'keyboard_shortcut'
      })
    }

    // Ctrl/Cmd + S (保存)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault() // 阻止默认保存
      window.journeyTracker.trackConversionGoal('save_attempt', {
        contentType: document.body.getAttribute('data-page-type') || 'page',
        contentTitle: document.title,
        method: 'keyboard_shortcut'
      })
    }
  })
}

/**
 * 获取点击上下文信息
 */
function getClickContext(element) {
  const section = element.closest('header, main, footer, article, aside, nav')
  if (section) {
    return section.tagName.toLowerCase()
  }

  // 检查是否在特定内容区域
  if (element.closest('.note-content')) return 'note_content'
  if (element.closest('.post-content')) return 'post_content'
  if (element.closest('.photo-metadata')) return 'photo_metadata'

  return 'unknown'
}

/**
 * 识别社交分享平台
 */
function getSocialPlatform(url) {
  if (url.includes('twitter.com')) return 'twitter'
  if (url.includes('facebook.com')) return 'facebook'
  if (url.includes('weibo.com')) return 'weibo'
  if (url.includes('linkedin.com')) return 'linkedin'
  return 'unknown'
}