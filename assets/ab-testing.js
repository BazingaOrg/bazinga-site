// A/B 测试框架
// 基于用户细分和随机分配的客户端 A/B 测试系统

import { trackUmami } from './umami.js'
import { createPrefixedId } from './id.js'

/**
 * A/B 测试管理器类
 */
class ABTestManager {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.experiments = new Map()
    this.userAssignments = new Map()
    this.exposureTracked = new Set()

    // 预定义的实验配置
    this.experimentConfigs = {
      // 写作页面优化实验
      'write_form_layout': {
        name: 'Write Form Layout Optimization',
        description: 'Test different form layouts to improve completion rate',
        status: 'active',
        variants: {
          'control': { weight: 50, name: 'Original Layout' },
          'compact': { weight: 25, name: 'Compact Layout' },
          'wizard': { weight: 25, name: 'Wizard Layout' }
        },
        targetPages: ['/write-note/', '/write-photo/', '/write-film/'],
        goals: ['form_submission', 'write_submit_success'],
        segments: ['desktop_user', 'mobile_user']
      },

      // 主页内容展示实验
      'homepage_content_order': {
        name: 'Homepage Content Order',
        description: 'Test different content ordering to improve engagement',
        status: 'active',
        variants: {
          'control': { weight: 40, name: 'Current Order' },
          'photos_first': { weight: 30, name: 'Photos First' },
          'stories_first': { weight: 30, name: 'Stories First' }
        },
        targetPages: ['/', '/index-zh-CN.html'],
        goals: ['photo_view', 'stories_view', 'content_engagement'],
        segments: ['first_time_visitor', 'returning_visitor']
      },

      // 内容阅读优化实验
      'reading_experience': {
        name: 'Reading Experience Enhancement',
        description: 'Test reading aids to improve content engagement',
        status: 'active',
        variants: {
          'control': { weight: 50, name: 'Standard Reading' },
          'progress_bar': { weight: 25, name: 'Reading Progress Bar' },
          'estimated_time': { weight: 25, name: 'Reading Time Estimate' }
        },
        targetPages: ['/notes/', '/posts/'],
        goals: ['content_deep_read', 'content_complete_read'],
        segments: ['high_engagement', 'medium_engagement']
      },

      // 照片浏览体验实验
      'photo_gallery_layout': {
        name: 'Photo Gallery Layout',
        description: 'Test different photo layouts for better browsing',
        status: 'active',
        variants: {
          'control': { weight: 34, name: 'Grid Layout' },
          'masonry': { weight: 33, name: 'Masonry Layout' },
          'carousel': { weight: 33, name: 'Carousel Layout' }
        },
        targetPages: ['/photos/', '/film/'],
        goals: ['photo_deep_browse', 'photo_like'],
        segments: ['photo_enthusiast', 'casual_browser']
      }
    }

    this.init()
  }

  generateSessionId() {
    return createPrefixedId('ab')
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
    // 加载用户历史分配
    this.loadUserAssignments()

    // 初始化当前页面的实验
    this.initializePageExperiments()

    // 监听转化目标事件
    this.setupGoalTracking()

    // 定期同步实验数据
    setInterval(() => {
      this.syncExperimentData()
    }, 60000) // 每分钟同步一次

    // 页面卸载时保存数据
    window.addEventListener('beforeunload', () => {
      this.saveUserAssignments()
    })
  }

  /**
   * 初始化当前页面的实验
   */
  initializePageExperiments() {
    const currentPage = window.location.pathname
    const currentPageType = document.body.getAttribute('data-page-type') || 'page'

    // 获取用户细分
    const userSegments = this.getUserSegments()

    // 检查每个实验是否适用于当前页面
    Object.entries(this.experimentConfigs).forEach(([experimentId, config]) => {
      if (this.shouldRunExperiment(experimentId, config, currentPage, userSegments)) {
        this.assignUserToVariant(experimentId, config)
      }
    })
  }

  /**
   * 检查是否应该运行实验
   */
  shouldRunExperiment(experimentId, config, currentPage, userSegments) {
    // 检查实验状态
    if (config.status !== 'active') {
      return false
    }

    // 检查页面匹配
    const pageMatches = config.targetPages.some(targetPage => {
      if (targetPage === currentPage) return true
      if (targetPage.endsWith('/') && currentPage.startsWith(targetPage.slice(0, -1))) return true
      return false
    })

    if (!pageMatches) {
      return false
    }

    // 检查用户细分匹配 (如果指定了细分)
    if (config.segments && config.segments.length > 0) {
      const hasMatchingSegment = config.segments.some(segment =>
        userSegments.includes(segment)
      )
      if (!hasMatchingSegment) {
        return false
      }
    }

    return true
  }

  /**
   * 将用户分配到变体
   */
  assignUserToVariant(experimentId, config) {
    // 检查用户是否已经分配过
    let assignment = this.userAssignments.get(experimentId)

    if (!assignment) {
      // 新分配：基于用户ID的确定性随机分配
      const variant = this.selectVariantForUser(config.variants)
      assignment = {
        experimentId,
        experimentName: config.name,
        variant: variant.key,
        variantName: variant.name,
        assignedAt: new Date().toISOString(),
        exposures: 0,
        goals: []
      }

      this.userAssignments.set(experimentId, assignment)

      // 追踪新分配
      trackUmami('ab_test_assignment', {
        session_id: this.sessionId,
        user_id: this.userId,
        experiment_id: experimentId,
        experiment_name: config.name,
        variant: assignment.variant,
        variant_name: assignment.variantName,
        assigned_at: assignment.assignedAt,
        page_url: window.location.pathname,
        timestamp: new Date().toISOString()
      })
    }

    // 存储实验信息
    this.experiments.set(experimentId, {
      config,
      assignment
    })

    // 应用变体
    this.applyVariant(experimentId, assignment.variant, config)

    // 追踪曝光
    this.trackExposure(experimentId, assignment)
  }

  /**
   * 为用户选择变体 (确定性随机)
   */
  selectVariantForUser(variants) {
    // 使用用户ID生成确定性随机数
    const hash = this.hashString(this.userId + 'variant_selection')
    const randomValue = (hash % 10000) / 10000 // 0-1 之间的值

    // 根据权重选择变体
    let cumulativeWeight = 0
    const variantEntries = Object.entries(variants)

    for (const [key, variant] of variantEntries) {
      cumulativeWeight += variant.weight / 100
      if (randomValue <= cumulativeWeight) {
        return { key, ...variant }
      }
    }

    // 默认返回第一个变体
    const [firstKey, firstVariant] = variantEntries[0]
    return { key: firstKey, ...firstVariant }
  }

  /**
   * 简单字符串哈希函数
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  }

  /**
   * 应用变体更改
   */
  applyVariant(experimentId, variant, config) {
    // 根据实验ID和变体应用相应的更改
    switch (experimentId) {
      case 'write_form_layout':
        this.applyWriteFormLayoutVariant(variant)
        break

      case 'homepage_content_order':
        this.applyHomepageContentOrderVariant(variant)
        break

      case 'reading_experience':
        this.applyReadingExperienceVariant(variant)
        break

      case 'photo_gallery_layout':
        this.applyPhotoGalleryLayoutVariant(variant)
        break

      default:
        console.warn(`Unknown experiment: ${experimentId}`)
    }

    // 在DOM中标记当前变体
    document.body.setAttribute(`data-ab-${experimentId}`, variant)
  }

  /**
   * 应用写作表单布局变体
   */
  applyWriteFormLayoutVariant(variant) {
    const formContainer = document.querySelector('.write-note-container')
    if (!formContainer) return

    switch (variant) {
      case 'compact':
        formContainer.classList.add('ab-compact-layout')
        // 可以添加内联样式或动态CSS
        this.addCSS(`
          .ab-compact-layout .form-field {
            margin-bottom: 1rem !important;
          }
          .ab-compact-layout .field-label {
            font-size: 0.9rem !important;
          }
          .ab-compact-layout .preview-section {
            max-height: 300px !important;
            overflow-y: auto !important;
          }
        `)
        break

      case 'wizard':
        formContainer.classList.add('ab-wizard-layout')
        this.initializeWizardLayout(formContainer)
        break

      default:
        // control - 无更改
        break
    }
  }

  /**
   * 应用主页内容顺序变体
   */
  applyHomepageContentOrderVariant(variant) {
    if (!document.body.classList.contains('col-')) return // 不是主页

    const main = document.querySelector('main')
    if (!main) return

    switch (variant) {
      case 'photos_first':
        const photosSection = main.querySelector('.photos')
        const storiesSection = main.querySelector('.stories')
        if (photosSection && storiesSection) {
          // 将照片部分移到 stories 之前
          storiesSection.parentNode.insertBefore(photosSection, storiesSection)
        }
        break

      case 'stories_first':
        const storiesFirst = main.querySelector('.stories')
        const postsSection = main.querySelector('.posts')
        if (storiesFirst && postsSection) {
          // 将 stories 移到最前面
          main.insertBefore(storiesFirst, main.firstElementChild)
        }
        break

      default:
        // control - 无更改
        break
    }
  }

  /**
   * 应用阅读体验变体
   */
  applyReadingExperienceVariant(variant) {
    switch (variant) {
      case 'progress_bar':
        this.addReadingProgressBar()
        break

      case 'estimated_time':
        this.addReadingTimeEstimate()
        break

      default:
        // control - 无更改
        break
    }
  }

  /**
   * 应用照片画廊布局变体
   */
  applyPhotoGalleryLayoutVariant(variant) {
    const photosWrapper = document.querySelector('.photos-wrapper')
    if (!photosWrapper) return

    switch (variant) {
      case 'masonry':
        photosWrapper.classList.add('ab-masonry-layout')
        this.initializeMasonryLayout(photosWrapper)
        break

      case 'carousel':
        photosWrapper.classList.add('ab-carousel-layout')
        this.initializeCarouselLayout(photosWrapper)
        break

      default:
        // control - 无更改
        break
    }
  }

  /**
   * 添加动态 CSS
   */
  addCSS(css) {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * 初始化向导布局
   */
  initializeWizardLayout(container) {
    // 这里可以实现更复杂的向导逻辑
    this.addCSS(`
      .ab-wizard-layout .form-field:not(.wizard-active) {
        display: none !important;
      }
      .wizard-navigation {
        display: flex;
        justify-content: space-between;
        margin: 1rem 0;
      }
    `)

    // 添加向导导航
    const navigation = document.createElement('div')
    navigation.className = 'wizard-navigation'
    navigation.innerHTML = `
      <button type="button" class="wizard-prev" disabled>上一步</button>
      <span class="wizard-step">步骤 1 / 3</span>
      <button type="button" class="wizard-next">下一步</button>
    `

    const form = container.querySelector('form')
    if (form) {
      form.appendChild(navigation)
    }
  }

  /**
   * 添加阅读进度条
   */
  addReadingProgressBar() {
    const progressBar = document.createElement('div')
    progressBar.innerHTML = `
      <div class="reading-progress-bar" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: #007acc;
        z-index: 1000;
        transition: width 0.3s ease;
      "></div>
    `

    document.body.appendChild(progressBar)

    // 更新进度条
    const updateProgress = () => {
      const scrollTop = window.pageYOffset
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0

      progressBar.querySelector('.reading-progress-bar').style.width = progress + '%'
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
  }

  /**
   * 添加阅读时间估算
   */
  addReadingTimeEstimate() {
    const contentElement = document.querySelector('.note-content, article, main')
    if (!contentElement) return

    const wordCount = contentElement.textContent.trim().split(/\s+/).length
    const readingTime = Math.max(1, Math.round(wordCount / 200)) // 200 words per minute

    const timeEstimate = document.createElement('div')
    timeEstimate.innerHTML = `
      <div class="reading-time-estimate" style="
        background: #f5f5f5;
        padding: 0.5rem 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #666;
      ">
        📖 预计阅读时间：${readingTime} 分钟 (${wordCount} 字)
      </div>
    `

    // 插入到内容开头
    contentElement.insertBefore(timeEstimate, contentElement.firstChild)
  }

  /**
   * 初始化瀑布流布局
   */
  initializeMasonryLayout(wrapper) {
    this.addCSS(`
      .ab-masonry-layout {
        column-count: auto !important;
        column-width: 300px !important;
        column-gap: 1rem !important;
      }
      .ab-masonry-layout figure {
        break-inside: avoid !important;
        margin-bottom: 1rem !important;
      }
    `)
  }

  /**
   * 初始化轮播布局
   */
  initializeCarouselLayout(wrapper) {
    wrapper.style.display = 'flex'
    wrapper.style.overflowX = 'auto'
    wrapper.style.scrollSnapType = 'x mandatory'

    const figures = wrapper.querySelectorAll('figure')
    figures.forEach(figure => {
      figure.style.minWidth = '80vw'
      figure.style.scrollSnapAlign = 'start'
      figure.style.marginRight = '1rem'
    })
  }

  /**
   * 追踪实验曝光
   */
  trackExposure(experimentId, assignment) {
    const exposureKey = `${experimentId}:${assignment.variant}`

    if (this.exposureTracked.has(exposureKey)) {
      return // 已经追踪过曝光
    }

    this.exposureTracked.add(exposureKey)
    assignment.exposures++

    trackUmami('ab_test_exposure', {
      session_id: this.sessionId,
      user_id: this.userId,
      experiment_id: experimentId,
      experiment_name: assignment.experimentName,
      variant: assignment.variant,
      variant_name: assignment.variantName,
      exposure_count: assignment.exposures,
      page_url: window.location.pathname,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 设置目标追踪
   */
  setupGoalTracking() {
    // 与旅程追踪器集成
    if (window.journeyTracker) {
      const originalTrackConversionGoal = window.journeyTracker.trackConversionGoal

      window.journeyTracker.trackConversionGoal = (goalName, data = {}) => {
        // 调用原始方法
        originalTrackConversionGoal.call(window.journeyTracker, goalName, data)

        // 检查是否是实验目标
        this.handleGoalConversion(goalName, data)
      }
    }

    // 监听其他目标事件
    document.addEventListener('ab_test_goal', (e) => {
      this.handleGoalConversion(e.detail.goalName, e.detail.data)
    })
  }

  /**
   * 处理目标转化
   */
  handleGoalConversion(goalName, data = {}) {
    this.experiments.forEach((experiment, experimentId) => {
      const { config, assignment } = experiment

      // 检查是否是此实验的目标
      if (config.goals.includes(goalName)) {
        // 记录转化
        assignment.goals.push({
          goalName,
          data,
          timestamp: new Date().toISOString()
        })

        // 追踪转化
        trackUmami('ab_test_conversion', {
          session_id: this.sessionId,
          user_id: this.userId,
          experiment_id: experimentId,
          experiment_name: assignment.experimentName,
          variant: assignment.variant,
          variant_name: assignment.variantName,
          goal_name: goalName,
          goal_data: data,
          conversion_count: assignment.goals.filter(g => g.goalName === goalName).length,
          page_url: window.location.pathname,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  /**
   * 获取用户细分
   */
  getUserSegments() {
    const segments = []

    // 与旅程追踪器集成获取用户细分
    if (window.journeyTracker && window.journeyTracker.userSegments) {
      segments.push(...window.journeyTracker.userSegments)
    }

    // 与内容健康度评分器集成
    if (window.contentHealthScorer) {
      const healthScore = window.contentHealthScorer.getCurrentHealthScore()
      if (healthScore.category === 'excellent' || healthScore.category === 'good') {
        segments.push('high_engagement')
      } else if (healthScore.category === 'fair') {
        segments.push('medium_engagement')
      }
    }

    // 基于历史行为的细分
    const visitHistory = this.getVisitHistory()
    if (visitHistory.length > 10) {
      segments.push('frequent_visitor')
    }

    // 基于内容偏好的细分
    const photoViews = parseInt(localStorage.getItem('photo_views_count') || '0')
    if (photoViews > 20) {
      segments.push('photo_enthusiast')
    } else if (photoViews > 5) {
      segments.push('casual_browser')
    }

    return segments
  }

  /**
   * 同步实验数据
   */
  syncExperimentData() {
    const experimentData = Array.from(this.experiments.entries()).map(([id, experiment]) => ({
      experimentId: id,
      assignment: experiment.assignment,
      config: {
        name: experiment.config.name,
        status: experiment.config.status
      }
    }))

    trackUmami('ab_test_sync', {
      session_id: this.sessionId,
      user_id: this.userId,
      active_experiments: experimentData.length,
      experiments: experimentData,
      page_url: window.location.pathname,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 加载用户历史分配
   */
  loadUserAssignments() {
    try {
      const stored = localStorage.getItem('ab_test_assignments')
      if (stored) {
        const assignments = JSON.parse(stored)
        Object.entries(assignments).forEach(([experimentId, assignment]) => {
          this.userAssignments.set(experimentId, assignment)
        })
      }
    } catch (e) {
      console.warn('Failed to load AB test assignments:', e)
    }
  }

  /**
   * 保存用户分配
   */
  saveUserAssignments() {
    try {
      const assignments = {}
      this.userAssignments.forEach((assignment, experimentId) => {
        assignments[experimentId] = assignment
      })
      localStorage.setItem('ab_test_assignments', JSON.stringify(assignments))
    } catch (e) {
      console.warn('Failed to save AB test assignments:', e)
    }
  }

  getVisitHistory() {
    try {
      return JSON.parse(localStorage.getItem('visit-history') || '[]')
    } catch (e) {
      return []
    }
  }

  // 公共 API
  getCurrentExperiments() {
    const experiments = {}
    this.experiments.forEach((experiment, id) => {
      experiments[id] = {
        name: experiment.config.name,
        variant: experiment.assignment.variant,
        variantName: experiment.assignment.variantName
      }
    })
    return experiments
  }

  getExperimentVariant(experimentId) {
    const experiment = this.experiments.get(experimentId)
    return experiment ? experiment.assignment.variant : null
  }

  triggerGoal(goalName, data = {}) {
    const event = new CustomEvent('ab_test_goal', {
      detail: { goalName, data }
    })
    document.dispatchEvent(event)
  }
}

// 自动初始化 A/B 测试管理器
let abTestManager = null

document.addEventListener('DOMContentLoaded', () => {
  abTestManager = new ABTestManager()

  // 导出到全局
  window.ABTestManager = ABTestManager
  window.abTestManager = abTestManager
  window.triggerABTestGoal = (goalName, data) => {
    if (abTestManager) {
      abTestManager.triggerGoal(goalName, data)
    }
  }

  trackUmami('ab_test_manager_initialized', {
    session_id: abTestManager.sessionId,
    user_id: abTestManager.userId,
    active_experiments: abTestManager.experiments.size,
    page_url: window.location.pathname,
    timestamp: new Date().toISOString()
  })
})