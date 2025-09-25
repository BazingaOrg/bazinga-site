// Stories 浏览行为追踪模块
// 专门用于追踪用户在 Stories 组件中的交互和浏览行为

import { trackUmami } from './umami.js'
import { createPrefixedId } from './id.js'

/**
 * Stories 行为追踪器类
 */
class StoriesTracker {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.storiesData = new Map()
    this.interactionStartTime = null
    this.currentStoryIndex = 0
    this.totalStories = 0
    this.viewportObserver = null
    this.isTracking = false
    this.scrollBehavior = {
      scrollEvents: 0,
      scrollDirection: [],
      maxScrollDepth: 0,
      scrollSpeed: []
    }

    this.init()
  }

  generateSessionId() {
    return createPrefixedId('stories')
  }

  init() {
    // 等待 open-stories 组件加载完成
    if (customElements.get('open-stories')) {
      this.setupStoriesTracking()
    } else {
      customElements.whenDefined('open-stories').then(() => {
        this.setupStoriesTracking()
      })
    }
  }

  setupStoriesTracking() {
    const storiesContainers = document.querySelectorAll('.stories')

    storiesContainers.forEach((container, containerIndex) => {
      this.setupContainerTracking(container, containerIndex)
    })

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isTracking) {
        this.trackStoriesPause()
      } else if (!document.hidden && this.isTracking) {
        this.trackStoriesResume()
      }
    })
  }

  setupContainerTracking(container, containerIndex) {
    const openStoriesElements = container.querySelectorAll('open-stories')

    openStoriesElements.forEach((openStories, storyIndex) => {
      this.setupStoryElementTracking(openStories, containerIndex, storyIndex)
    })
  }

  setupStoryElementTracking(openStories, containerIndex, storyIndex) {
    const storyId = `container-${containerIndex}-story-${storyIndex}`
    const src = openStories.getAttribute('src')
    const isHighlight = openStories.hasAttribute('is-highlight')
    const storyType = this.extractStoryTypeFromSrc(src)

    // 初始化故事数据
    this.storiesData.set(storyId, {
      src,
      type: storyType,
      isHighlight,
      viewCount: 0,
      interactionCount: 0,
      totalTimeViewed: 0,
      viewStartTime: null,
      interactions: [],
      scrollBehavior: {
        scrollEvents: 0,
        maxDepth: 0
      }
    })

    // 设置视口观察器
    this.setupViewportObserver(openStories, storyId)

    // 设置交互事件监听
    this.setupInteractionListeners(openStories, storyId)

    // 设置滚动追踪
    this.setupScrollTracking(openStories, storyId)

    // 设置加载性能追踪
    this.setupPerformanceTracking(openStories, storyId)
  }

  extractStoryTypeFromSrc(src) {
    if (!src) return 'unknown'

    if (src.includes('/stories.json')) return '24h'

    const match = src.match(/stories-(.+)\.json/)
    return match ? match[1] : 'unknown'
  }

  setupViewportObserver(element, storyId) {
    if (!('IntersectionObserver' in window)) return

    if (!this.viewportObserver) {
      this.viewportObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const elementStoryId = Array.from(this.storiesData.keys()).find(id => {
            // 找到对应的 story ID (简化的匹配逻辑)
            return entry.target.getAttribute('src') === this.storiesData.get(id).src
          })

          if (elementStoryId) {
            if (entry.isIntersecting) {
              this.startViewTracking(elementStoryId)
            } else {
              this.endViewTracking(elementStoryId)
            }
          }
        })
      }, {
        threshold: 0.5, // 50% 可见时开始追踪
        rootMargin: '0px'
      })
    }

    this.viewportObserver.observe(element)
  }

  startViewTracking(storyId) {
    const storyData = this.storiesData.get(storyId)
    if (!storyData) return

    storyData.viewCount++
    storyData.viewStartTime = Date.now()
    this.isTracking = true

    trackUmami('stories_view_start', {
      session_id: this.sessionId,
      story_id: storyId,
      story_type: storyData.type,
      is_highlight: storyData.isHighlight,
      view_count: storyData.viewCount,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  endViewTracking(storyId) {
    const storyData = this.storiesData.get(storyId)
    if (!storyData || !storyData.viewStartTime) return

    const viewDuration = Date.now() - storyData.viewStartTime
    storyData.totalTimeViewed += viewDuration
    storyData.viewStartTime = null

    trackUmami('stories_view_end', {
      session_id: this.sessionId,
      story_id: storyId,
      story_type: storyData.type,
      is_highlight: storyData.isHighlight,
      view_duration: viewDuration,
      total_time_viewed: storyData.totalTimeViewed,
      interaction_count: storyData.interactionCount,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })

    // 检查是否所有 stories 都结束了观察
    const activeViews = Array.from(this.storiesData.values()).filter(data => data.viewStartTime !== null)
    if (activeViews.length === 0) {
      this.isTracking = false
    }
  }

  setupInteractionListeners(element, storyId) {
    // 监听点击事件
    element.addEventListener('click', (e) => {
      this.trackInteraction(storyId, 'click', {
        target: e.target.tagName,
        targetClass: e.target.className,
        clientX: e.clientX,
        clientY: e.clientY
      })
    })

    // 监听触摸事件（移动端）
    let touchStartTime = null
    let touchStartPos = { x: 0, y: 0 }

    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now()
      touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    })

    element.addEventListener('touchend', (e) => {
      if (!touchStartTime) return

      const touchDuration = Date.now() - touchStartTime
      const touchEndPos = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      }

      const deltaX = touchEndPos.x - touchStartPos.x
      const deltaY = touchEndPos.y - touchStartPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 判断手势类型
      let gestureType = 'tap'
      if (distance > 20) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          gestureType = deltaX > 0 ? 'swipe_right' : 'swipe_left'
        } else {
          gestureType = deltaY > 0 ? 'swipe_down' : 'swipe_up'
        }
      } else if (touchDuration > 500) {
        gestureType = 'long_press'
      }

      this.trackInteraction(storyId, 'touch', {
        gesture: gestureType,
        duration: touchDuration,
        distance: distance,
        deltaX: deltaX,
        deltaY: deltaY
      })
    })

    // 监听键盘事件
    element.addEventListener('keydown', (e) => {
      this.trackInteraction(storyId, 'keyboard', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey
      })
    })

    // 监听鼠标悬停（桌面端）
    let hoverStartTime = null

    element.addEventListener('mouseenter', () => {
      hoverStartTime = Date.now()
    })

    element.addEventListener('mouseleave', () => {
      if (hoverStartTime) {
        const hoverDuration = Date.now() - hoverStartTime
        this.trackInteraction(storyId, 'hover', {
          duration: hoverDuration
        })
        hoverStartTime = null
      }
    })
  }

  trackInteraction(storyId, type, data) {
    const storyData = this.storiesData.get(storyId)
    if (!storyData) return

    storyData.interactionCount++
    storyData.interactions.push({
      type,
      timestamp: Date.now(),
      data
    })

    trackUmami('stories_interaction', {
      session_id: this.sessionId,
      story_id: storyId,
      story_type: storyData.type,
      is_highlight: storyData.isHighlight,
      interaction_type: type,
      interaction_data: data,
      interaction_count: storyData.interactionCount,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  setupScrollTracking(element, storyId) {
    let scrollTimer = null
    let lastScrollTop = 0
    let scrollStartTime = Date.now()

    const handleScroll = () => {
      const currentScrollTop = element.scrollTop || window.pageYOffset
      const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up'
      const scrollSpeed = Math.abs(currentScrollTop - lastScrollTop)

      const storyData = this.storiesData.get(storyId)
      if (storyData) {
        storyData.scrollBehavior.scrollEvents++
        storyData.scrollBehavior.maxDepth = Math.max(
          storyData.scrollBehavior.maxDepth,
          currentScrollTop
        )
      }

      this.scrollBehavior.scrollEvents++
      this.scrollBehavior.scrollDirection.push(scrollDirection)
      this.scrollBehavior.maxScrollDepth = Math.max(
        this.scrollBehavior.maxScrollDepth,
        currentScrollTop
      )
      this.scrollBehavior.scrollSpeed.push(scrollSpeed)

      lastScrollTop = currentScrollTop

      // 防抖：延迟追踪滚动结束事件
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        const scrollDuration = Date.now() - scrollStartTime

        trackUmami('stories_scroll', {
          session_id: this.sessionId,
          story_id: storyId,
          story_type: storyData?.type || 'unknown',
          scroll_duration: scrollDuration,
          scroll_events: storyData?.scrollBehavior.scrollEvents || 0,
          max_scroll_depth: storyData?.scrollBehavior.maxDepth || 0,
          avg_scroll_speed: this.calculateAvgScrollSpeed(),
          predominant_direction: this.getPredominantScrollDirection(),
          timestamp: new Date().toISOString(),
          language: document.documentElement.lang || 'en-US'
        })

        scrollStartTime = Date.now()
      }, 150) // 150ms 无滚动后视为滚动结束
    }

    // 监听元素或窗口滚动
    if (element.scrollHeight > element.clientHeight) {
      element.addEventListener('scroll', handleScroll, { passive: true })
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }
  }

  calculateAvgScrollSpeed() {
    if (this.scrollBehavior.scrollSpeed.length === 0) return 0

    const sum = this.scrollBehavior.scrollSpeed.reduce((a, b) => a + b, 0)
    return sum / this.scrollBehavior.scrollSpeed.length
  }

  getPredominantScrollDirection() {
    if (this.scrollBehavior.scrollDirection.length === 0) return 'none'

    const directionCounts = this.scrollBehavior.scrollDirection.reduce((acc, dir) => {
      acc[dir] = (acc[dir] || 0) + 1
      return acc
    }, {})

    return Object.keys(directionCounts).reduce((a, b) =>
      directionCounts[a] > directionCounts[b] ? a : b
    )
  }

  setupPerformanceTracking(element, storyId) {
    // 监听 Stories 组件的加载事件
    const trackLoadingStart = Date.now()

    // 监听组件定义完成
    if (customElements.get('open-stories')) {
      this.trackStoriesLoadingComplete(storyId, trackLoadingStart)
    }

    // 监听网络请求（如果可以访问）
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          // 追踪 stories JSON 文件的加载性能
          if (entry.name && entry.name.includes('stories') && entry.name.includes('.json')) {
            trackUmami('stories_resource_timing', {
              session_id: this.sessionId,
              story_id: storyId,
              resource_url: entry.name,
              duration: entry.duration,
              transfer_size: entry.transferSize || 0,
              response_start: entry.responseStart,
              response_end: entry.responseEnd,
              timestamp: new Date().toISOString(),
              language: document.documentElement.lang || 'en-US'
            })
          }
        })
      })

      try {
        observer.observe({ entryTypes: ['resource'] })
      } catch (e) {
        console.warn('PerformanceObserver not fully supported:', e)
      }
    }

    // 监听图片加载
    const images = element.querySelectorAll('img')
    images.forEach((img, index) => {
      const imageLoadStart = Date.now()

      const onLoad = () => {
        const loadDuration = Date.now() - imageLoadStart

        trackUmami('stories_image_load', {
          session_id: this.sessionId,
          story_id: storyId,
          image_index: index,
          load_duration: loadDuration,
          image_src: img.src,
          image_size: {
            width: img.naturalWidth,
            height: img.naturalHeight
          },
          timestamp: new Date().toISOString(),
          language: document.documentElement.lang || 'en-US'
        })
      }

      if (img.complete) {
        onLoad()
      } else {
        img.addEventListener('load', onLoad)
        img.addEventListener('error', () => {
          trackUmami('stories_image_error', {
            session_id: this.sessionId,
            story_id: storyId,
            image_index: index,
            image_src: img.src,
            timestamp: new Date().toISOString(),
            language: document.documentElement.lang || 'en-US'
          })
        })
      }
    })
  }

  trackStoriesLoadingComplete(storyId, startTime) {
    const loadDuration = Date.now() - startTime
    const storyData = this.storiesData.get(storyId)

    trackUmami('stories_load_complete', {
      session_id: this.sessionId,
      story_id: storyId,
      story_type: storyData?.type || 'unknown',
      is_highlight: storyData?.isHighlight || false,
      load_duration: loadDuration,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  trackStoriesPause() {
    trackUmami('stories_session_pause', {
      session_id: this.sessionId,
      active_stories: Array.from(this.storiesData.entries())
        .filter(([_, data]) => data.viewStartTime !== null)
        .map(([id, _]) => id),
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  trackStoriesResume() {
    trackUmami('stories_session_resume', {
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  // 会话结束时的汇总追踪
  trackSessionSummary() {
    const sessionData = Array.from(this.storiesData.entries()).map(([id, data]) => ({
      story_id: id,
      story_type: data.type,
      is_highlight: data.isHighlight,
      view_count: data.viewCount,
      total_time_viewed: data.totalTimeViewed,
      interaction_count: data.interactionCount,
      scroll_events: data.scrollBehavior.scrollEvents
    }))

    trackUmami('stories_session_summary', {
      session_id: this.sessionId,
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      stories_viewed: sessionData.length,
      total_interactions: sessionData.reduce((sum, story) => sum + story.interaction_count, 0),
      total_view_time: sessionData.reduce((sum, story) => sum + story.total_time_viewed, 0),
      stories_data: sessionData,
      scroll_summary: {
        total_scroll_events: this.scrollBehavior.scrollEvents,
        max_scroll_depth: this.scrollBehavior.maxScrollDepth,
        avg_scroll_speed: this.calculateAvgScrollSpeed(),
        predominant_direction: this.getPredominantScrollDirection()
      },
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || 'en-US'
    })
  }

  // 清理方法
  destroy() {
    if (this.viewportObserver) {
      this.viewportObserver.disconnect()
    }

    // 发送会话汇总
    this.trackSessionSummary()

    // 清理数据
    this.storiesData.clear()
  }
}

// 自动初始化 Stories 追踪器
let storiesTracker = null

document.addEventListener('DOMContentLoaded', () => {
  // 检查页面是否包含 Stories 组件
  const storiesContainers = document.querySelectorAll('.stories')

  if (storiesContainers.length > 0) {
    storiesTracker = new StoriesTracker()

    // 页面卸载时清理追踪器
    window.addEventListener('beforeunload', () => {
      if (storiesTracker) {
        storiesTracker.destroy()
      }
    })

    trackUmami('stories_page_loaded', {
      stories_containers: storiesContainers.length,
      open_stories_elements: document.querySelectorAll('open-stories').length,
      page_url: window.location.pathname,
      language: document.documentElement.lang || 'en-US',
      timestamp: new Date().toISOString()
    })
  }
})

// 导出追踪器供其他脚本使用
window.StoriesTracker = StoriesTracker
window.trackStoriesEvent = trackUmami