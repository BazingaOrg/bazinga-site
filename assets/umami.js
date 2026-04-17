/**
 * Shared helpers for Umami tracking.
 * Provides a safe wrapper that queues events until Umami loads.
 */
export function trackUmami(eventName, data = {}, options = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const scope = options.scope || 'umami'
  const normalizedData = normalizeTrackingPayload(data)

  try {
    ensureUmamiQueue()

    if (typeof window.umami === 'function') {
      window.umami(eventName, normalizedData)
      return
    }

    if (typeof window.umami?.track === 'function') {
      window.umami.track(eventName, normalizedData)
    }
  } catch (error) {
    console.warn(`[${scope}] Umami tracking error:`, error)
  }
}

function ensureUmamiQueue() {
  if (typeof window.umami === 'function') {
    return
  }

  if (typeof window.umami === 'undefined') {
    window.umami = function() {
      (window.umami.q = window.umami.q || []).push(arguments)
    }
  }

  if (typeof window.umami.track !== 'function') {
    window.umami.track = function(name, payload) {
      if (typeof window.umami === 'function') {
        window.umami(name, payload)
      }
    }
  }
}

const KEY_ALIASES = {
  sessionId: 'session_id',
  userId: 'user_id',
  pageUrl: 'page_url',
  currentPage: 'current_page',
  targetPage: 'target_page',
  goalName: 'goal_name',
  goalData: 'goal_data',
  funnelName: 'funnel_name',
  funnelStep: 'funnel_step',
  eventName: 'event_name',
  eventData: 'event_data',
  formType: 'form_type',
  completionTime: 'completion_time',
  fieldChanges: 'field_changes',
  previewViews: 'preview_views',
  contentUrl: 'content_url',
  sourcePage: 'source_page',
  pageType: 'page_type',
  pageTitle: 'page_title',
  pageDate: 'page_date'
}

/**
 * Normalizes analytics payload keys to snake_case.
 */
function normalizeTrackingPayload(payload) {
  const safeObject = isPlainObject(payload) ? payload : {}
  const normalized = deepCloneAndNormalize(safeObject, 0)

  if (typeof normalized.tracking_schema_version === 'undefined') {
    normalized.tracking_schema_version = '2026-04-v1'
  }

  return normalized
}

function deepCloneAndNormalize(input, depth) {
  if (depth > 4) return input

  if (Array.isArray(input)) {
    return input.map(item => deepCloneAndNormalize(item, depth + 1))
  }

  if (!isPlainObject(input)) {
    return input
  }

  const output = {}

  Object.entries(input).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key)
    output[normalizedKey] = deepCloneAndNormalize(value, depth + 1)
  })

  return output
}

function normalizeKey(key) {
  if (KEY_ALIASES[key]) {
    return KEY_ALIASES[key]
  }

  if (!/[A-Z]/.test(key)) {
    return key
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}
