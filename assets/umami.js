/**
 * Shared helpers for Umami tracking.
 * Provides a safe wrapper that queues events until Umami loads.
 */
export function trackUmami(eventName, data = {}, options = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const scope = options.scope || 'umami'

  try {
    ensureUmamiQueue()

    if (typeof window.umami === 'function') {
      window.umami(eventName, data)
      return
    }

    if (typeof window.umami?.track === 'function') {
      window.umami.track(eventName, data)
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
