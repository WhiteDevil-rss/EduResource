export function buildQueryString(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (entries.length === 0) {
    return ''
  }

  const searchParams = new URLSearchParams()
  entries.forEach(([key, value]) => {
    searchParams.set(key, String(value))
  })

  return `?${searchParams.toString()}`
}

export async function fetchJson(url, init = {}) {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }

  return payload
}
