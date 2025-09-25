/**
 * Helpers for generating stable, prefixed identifiers.
 */
export function createPrefixedId(prefix = 'id') {
  const base = generateRandomId()
  return `${prefix}_${base}`
}

function generateRandomId() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '')
    }

    if (crypto.getRandomValues) {
      const array = new Uint32Array(4)
      crypto.getRandomValues(array)
      return Array.from(array, part => part.toString(36)).join('').slice(0, 20)
    }
  }

  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 12)
  return `${timestamp}${random}`
}
