// Vercel Serverless Function for Jekyll site tracking
// Located at api/track.js to work with Jekyll deployment

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET') {
    // 健康检查
    res.status(200).json({
      service: 'Server-side Umami tracking for Jekyll',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      umami_configured: !!process.env.UMAMI_API_TOKEN
    })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // 解析请求体
    const payload = req.body

    // 验证请求
    if (!payload.events || !Array.isArray(payload.events)) {
      res.status(400).json({ error: 'Invalid events data' })
      return
    }

    // 获取客户端信息
    const userAgent = req.headers['user-agent'] || payload.userAgent
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     req.connection.remoteAddress ||
                     '127.0.0.1'

    // 处理每个事件
    const processedEvents = await Promise.all(
      payload.events.map(event => processEvent(event, {
        userAgent,
        ip: clientIP,
        sessionId: payload.sessionId,
        userId: payload.userId,
        timestamp: payload.timestamp
      }))
    )

    // 发送到 Umami (如果配置了 API Token)
    let umamiResponse = null
    if (process.env.UMAMI_API_TOKEN) {
      umamiResponse = await forwardToUmami(processedEvents, {
        userAgent,
        ip: clientIP,
        sessionId: payload.sessionId
      })
    }

    // 存储到自定义数据存储
    await storeAnalyticsData(processedEvents, {
      sessionId: payload.sessionId,
      userId: payload.userId,
      userAgent,
      ip: clientIP,
      timestamp: payload.timestamp
    })

    res.status(200).json({
      success: true,
      processed: processedEvents.length,
      umami: umamiResponse ? 'forwarded' : 'skipped',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Server tracking error:', error)

    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    })
  }
}

/**
 * 处理单个事件数据
 */
async function processEvent(event, context) {
  // 数据清洗和增强
  const processedEvent = {
    name: sanitizeEventName(event.name),
    data: sanitizeEventData(event.data || {}),
    url: event.url || '',
    referrer: event.referrer || '',
    title: event.title || '',
    hostname: event.hostname || 'site.bazinga.ink',
    language: event.language || 'en-US',
    screen: event.screen || ''
  }

  // 添加服务端上下文
  if (processedEvent.data) {
    processedEvent.data.server_processed = true
    processedEvent.data.server_timestamp = new Date().toISOString()
    processedEvent.data.session_id = context.sessionId

    if (context.userId) {
      processedEvent.data.user_id = context.userId
    }

    // 添加地理位置信息 (基于 IP)
    const geoData = await getGeoLocation(context.ip)
    if (geoData) {
      processedEvent.data.geo_country = geoData.country
      processedEvent.data.geo_region = geoData.region
      processedEvent.data.geo_city = geoData.city
    }

    // 解析 User Agent
    const deviceInfo = parseUserAgent(context.userAgent || '')
    Object.assign(processedEvent.data, deviceInfo)
  }

  return processedEvent
}

/**
 * 清理事件名称
 */
function sanitizeEventName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50)
}

/**
 * 清理事件数据
 */
function sanitizeEventData(data) {
  const sanitized = {}

  // 敏感数据过滤
  const sensitiveKeys = [
    'password', 'token', 'key', 'secret', 'auth', 'credential',
    'ssn', 'credit_card', 'phone', 'email_full', 'ip_address'
  ]

  Object.entries(data).forEach(([key, value]) => {
    // 检查敏感键名
    const isSensitive = sensitiveKeys.some(sensitive =>
      key.toLowerCase().includes(sensitive)
    )

    if (isSensitive) {
      sanitized[key] = '[FILTERED]'
      return
    }

    // 数据类型处理
    if (typeof value === 'string') {
      sanitized[key] = value.substring(0, 255)
    } else if (typeof value === 'number') {
      sanitized[key] = isFinite(value) ? value : 0
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 20)
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeEventData(value)
    }
  })

  return sanitized
}

/**
 * 转发事件到 Umami
 */
async function forwardToUmami(events, context) {
  if (!process.env.UMAMI_API_TOKEN) {
    return null
  }

  try {
    const UMAMI_API_URL = 'https://cloud.umami.is/api'
    const UMAMI_WEBSITE_ID = 'a9c48eab-814c-4ebc-bb56-b0336f0dc427'

    const response = await fetch(`${UMAMI_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UMAMI_API_TOKEN}`,
        'User-Agent': context.userAgent || 'Server-Side-Tracking'
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: UMAMI_WEBSITE_ID,
          session: context.sessionId,
          events: events.map(event => ({
            name: event.name,
            data: event.data,
            url: event.url,
            title: event.title,
            referrer: event.referrer
          }))
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Umami API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to forward to Umami:', error)
    return null
  }
}

/**
 * 存储分析数据
 */
async function storeAnalyticsData(events, context) {
  const analyticsRecord = {
    sessionId: context.sessionId,
    userId: context.userId,
    userAgent: context.userAgent,
    ip: context.ip,
    timestamp: context.timestamp,
    events: events,
    processed_at: new Date().toISOString()
  }

  try {
    // 存储到 Vercel KV (如果配置)
    if (process.env.KV_URL && process.env.KV_REST_API_TOKEN) {
      const kvResponse = await fetch(`${process.env.KV_URL}/set/analytics:${context.sessionId}:${Date.now()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analyticsRecord)
      })

      if (!kvResponse.ok) {
        console.warn('Failed to store to KV:', kvResponse.status)
      }
    }

    // 发送到 webhook (如果配置)
    if (process.env.ANALYTICS_WEBHOOK_URL) {
      await fetch(process.env.ANALYTICS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsRecord)
      })
    }

  } catch (error) {
    console.error('Failed to store analytics data:', error)
  }
}

/**
 * 获取地理位置信息
 */
async function getGeoLocation(ip) {
  if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null
  }

  try {
    // 创建 AbortController 用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      country: data.country_name || data.country_code,
      region: data.region || data.region_code,
      city: data.city
    }
  } catch (error) {
    console.warn('Geo location lookup failed:', error)
    return null
  }
}

/**
 * 解析 User Agent
 */
function parseUserAgent(userAgent) {
  const result = {}

  if (!userAgent) return result

  // 浏览器检测
  if (userAgent.includes('Chrome')) {
    result.browser = 'Chrome'
    const match = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)
    if (match) result.browser_version = match[1]
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox'
    const match = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)
    if (match) result.browser_version = match[1]
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    result.browser = 'Safari'
    const match = userAgent.match(/Safari\/(\d+(?:\.\d+)?)/)
    if (match) result.browser_version = match[1]
  } else if (userAgent.includes('Edge')) {
    result.browser = 'Edge'
    const match = userAgent.match(/Edge\/(\d+(?:\.\d+)?)/)
    if (match) result.browser_version = match[1]
  }

  // 操作系统检测
  if (userAgent.includes('Windows')) {
    result.os = 'Windows'
    if (userAgent.includes('Windows NT 10.0')) result.os_version = '10'
    else if (userAgent.includes('Windows NT 6.1')) result.os_version = '7'
  } else if (userAgent.includes('Mac OS X')) {
    result.os = 'macOS'
    const match = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/)
    if (match) result.os_version = match[1].replace(/_/g, '.')
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux'
  } else if (userAgent.includes('Android')) {
    result.os = 'Android'
    const match = userAgent.match(/Android (\d+(?:\.\d+)?)/)
    if (match) result.os_version = match[1]
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    result.os = 'iOS'
    const match = userAgent.match(/OS (\d+(?:[._]\d+)?)/)
    if (match) result.os_version = match[1].replace(/_/g, '.')
  }

  // 设备类型检测
  result.is_mobile = /Mobile|Android|iPhone/i.test(userAgent)
  result.is_tablet = /iPad|Tablet/i.test(userAgent)
  result.is_desktop = !result.is_mobile && !result.is_tablet

  if (result.is_mobile) result.device_type = 'mobile'
  else if (result.is_tablet) result.device_type = 'tablet'
  else result.device_type = 'desktop'

  return result
}