// 服务端追踪客户端库
// 用于将客户端分析数据批量发送到服务端 API

import { createPrefixedId } from './id.js'

/**
 * 服务端追踪管理器类
 */
class ServerTracker {
  constructor() {
    this.apiEndpoint = '/api/track'
    this.batchSize = 10
    this.flushInterval = 30000 // 30秒
    this.maxRetries = 3
    this.retryDelay = 1000 // 1秒

    this.eventQueue = []
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.isOnline = navigator.onLine
    this.flushTimer = null

    this.init()
  }

  generateSessionId() {
    return createPrefixedId('server')
  }

  getUserId() {
    try {
      let userId = localStorage.getItem('user-journey-id')
      if (!userId) {
        userId = createPrefixedId('user')
        localStorage.setItem('user-journey-id', userId)
      }
      return userId
    } catch (e) {
      return null
    }
  }

  init() {
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushQueue() // 网络恢复时立即发送
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // 定期发送队列中的事件
    this.startAutoFlush()

    // 页面卸载时发送剩余事件
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true) // 同步发送
    })

    // 页面隐藏时也发送 (移动端)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushQueue()
      }
    })
  }

  /**
   * 追踪事件到服务端
   */
  track(eventName, eventData = {}) {
    const event = {
      name: eventName,
      data: {
        ...eventData,
        client_timestamp: new Date().toISOString(),
        client_url: window.location.href,
        client_referrer: document.referrer,
        client_title: document.title,
        client_language: document.documentElement.lang || navigator.language,
        client_screen: `${screen.width}x${screen.height}`,
        client_viewport: `${window.innerWidth}x${window.innerHeight}`
      },
      url: window.location.pathname,
      referrer: document.referrer,
      title: document.title,
      hostname: window.location.hostname,
      language: document.documentElement.lang || navigator.language,
      screen: `${screen.width}x${screen.height}`
    }

    this.addToQueue(event)
  }

  /**
   * 批量追踪多个事件
   */
  trackBatch(events) {
    events.forEach(event => {
      if (typeof event === 'object' && event.name) {
        this.track(event.name, event.data)
      }
    })
  }

  /**
   * 添加事件到队列
   */
  addToQueue(event) {
    this.eventQueue.push(event)

    // 如果队列满了，立即发送
    if (this.eventQueue.length >= this.batchSize) {
      this.flushQueue()
    }
  }

  /**
   * 开始自动发送定时器
   */
  startAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushQueue()
      }
    }, this.flushInterval)
  }

  /**
   * 发送队列中的事件
   */
  async flushQueue(isSync = false) {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return
    }

    const eventsToSend = this.eventQueue.splice(0, this.batchSize)
    const payload = {
      events: eventsToSend,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      batch: eventsToSend.length > 1
    }

    try {
      if (isSync) {
        // 同步发送 (页面卸载时使用)
        this.sendSync(payload)
      } else {
        // 异步发送
        await this.sendAsync(payload)
      }
    } catch (error) {
      console.warn('Failed to send events to server:', error)

      // 发送失败，将事件重新加入队列 (限制重试次数)
      eventsToSend.forEach(event => {
        if (!event._retryCount) event._retryCount = 0
        if (event._retryCount < this.maxRetries) {
          event._retryCount++
          this.eventQueue.unshift(event)
        }
      })
    }
  }

  /**
   * 异步发送事件
   */
  async sendAsync(payload, retryCount = 0) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const result = await response.json()

      // 追踪发送成功
      this.trackSendSuccess(result, payload.events.length)

      return result
    } catch (error) {
      // 重试机制
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount)) // 指数退避
        return this.sendAsync(payload, retryCount + 1)
      }

      throw error
    }
  }

  /**
   * 同步发送事件 (使用 sendBeacon 或同步 fetch)
   */
  sendSync(payload) {
    const data = JSON.stringify(payload)

    // 优先使用 sendBeacon (更可靠)
    if ('sendBeacon' in navigator) {
      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon(this.apiEndpoint, blob)
    } else {
      // 备选：同步 XMLHttpRequest
      try {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', this.apiEndpoint, false) // 同步请求
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(data)
      } catch (error) {
        console.warn('Sync send failed:', error)
      }
    }
  }

  /**
   * 追踪发送成功事件 (仅发送到 Umami)
   */
  trackSendSuccess(result, eventCount) {
    try {
      if (typeof window.umami === 'function') {
        window.umami('server_track_success', {
          session_id: this.sessionId,
          events_sent: eventCount,
          server_processed: result.processed,
          umami_status: result.umami,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      // 忽略追踪错误
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.eventQueue.length,
      sessionId: this.sessionId,
      userId: this.userId,
      isOnline: this.isOnline,
      autoFlushActive: !!this.flushTimer
    }
  }

  /**
   * 手动触发发送
   */
  flush() {
    return this.flushQueue()
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.eventQueue.length = 0
  }

  /**
   * 停止自动发送
   */
  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * 重启自动发送
   */
  start() {
    this.startAutoFlush()
  }
}

// 全局服务端追踪器实例
let serverTracker = null

// 初始化服务端追踪器
document.addEventListener('DOMContentLoaded', () => {
  serverTracker = new ServerTracker()

  // 导出到全局
  window.ServerTracker = ServerTracker
  window.serverTracker = serverTracker

  // 追踪初始化事件
  serverTracker.track('server_tracker_initialized', {
    page_url: window.location.pathname,
    page_type: document.body.getAttribute('data-page-type') || 'page',
    language: document.documentElement.lang || 'en-US'
  })

  // 与现有追踪器集成
  integrateWithExistingTrackers()
})

/**
 * 与现有追踪器集成
 */
function integrateWithExistingTrackers() {
  // 等待其他追踪器加载
  setTimeout(() => {
    // 与旅程追踪器集成
    if (window.journeyTracker && serverTracker) {
      const originalTrackConversionGoal = window.journeyTracker.trackConversionGoal

      window.journeyTracker.trackConversionGoal = function(goalName, data = {}) {
        // 调用原始方法
        originalTrackConversionGoal.call(this, goalName, data)

        // 发送到服务端
        serverTracker.track('conversion_goal_server', {
          goal_name: goalName,
          goal_data: data,
          session_id: this.sessionId,
          user_id: this.userId,
          source: 'journey_tracker'
        })
      }
    }

    // 与内容健康度评分器集成
    if (window.contentHealthScorer && serverTracker) {
      // 定期发送健康度评分到服务端
      setInterval(() => {
        const healthScore = window.contentHealthScorer.getCurrentHealthScore()

        serverTracker.track('content_health_server', {
          overall_score: healthScore.overallScore,
          category: healthScore.category,
          metrics: healthScore.metrics,
          user_behavior: healthScore.userBehavior,
          page_url: window.location.pathname,
          source: 'health_scorer'
        })
      }, 60000) // 每分钟发送一次
    }

    // 与表单追踪器集成
    if (window.FormTracker && serverTracker) {
      // 监听表单追踪事件
      document.addEventListener('form_submit_success', (e) => {
        serverTracker.track('form_success_server', {
          form_type: e.detail.formType,
          session_id: e.detail.sessionId,
          completion_time: e.detail.completionTime,
          source: 'form_tracker'
        })
      })
    }

    // 与 Stories 追踪器集成
    if (window.storiesTracker && serverTracker) {
      // 包装 Stories 事件发送到服务端
      const originalTrackInteraction = window.storiesTracker.trackInteraction

      if (originalTrackInteraction) {
        window.storiesTracker.trackInteraction = function(storyId, type, data) {
          // 调用原始方法
          originalTrackInteraction.call(this, storyId, type, data)

          // 发送到服务端
          serverTracker.track('stories_interaction_server', {
            story_id: storyId,
            interaction_type: type,
            interaction_data: data,
            session_id: this.sessionId,
            source: 'stories_tracker'
          })
        }
      }
    }

    console.log('Server tracker integrated with existing trackers')
  }, 2000)
}

// 导出追踪函数供直接使用
window.trackToServer = function(eventName, eventData) {
  if (serverTracker) {
    serverTracker.track(eventName, eventData)
  } else {
    console.warn('Server tracker not initialized yet')
  }
}

// 批量追踪函数
window.trackBatchToServer = function(events) {
  if (serverTracker) {
    serverTracker.trackBatch(events)
  } else {
    console.warn('Server tracker not initialized yet')
  }
}