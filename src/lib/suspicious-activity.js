import 'server-only'
import { firestore } from '@/lib/firebase-edge'

const SUSPICIOUS_ACTIVITIES_COLLECTION = 'suspicious_activities'
const SUSPICIOUS_DEDUPE_COLLECTION = 'suspicious_activity_dedupe'
const SUSPICIOUS_RATE_COLLECTION = 'suspicious_activity_rate'

function nowIso() {
  return new Date().toISOString()
}

function toLower(value) {
  return String(value || '').trim().toLowerCase()
}

function toTitle(value, fallback = 'Unknown') {
  const normalized = String(value || '').trim()
  if (!normalized) return fallback
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function simpleHash(input) {
  const text = String(input || '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return String(Math.abs(hash))
}

function isPrivateOrUnknownIp(ipAddress) {
  const ip = String(ipAddress || '').trim()
  if (!ip || ip === 'unknown') return true
  if (ip === '::1' || ip === '127.0.0.1') return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true
  if (ip.startsWith('172.')) {
    const parts = ip.split('.')
    const second = Number(parts[1] || 0)
    if (second >= 16 && second <= 31) return true
  }
  return false
}

export function getRequestIpAddress(request) {
  const directIp = String(request?.ip || '').trim()
  if (directIp) return directIp

  const forwarded = request?.headers?.get('x-forwarded-for') || ''
  const edgeIp = request?.headers?.get('cf-connecting-ip') || request?.headers?.get('x-real-ip') || ''
  const fromForwarded = String(forwarded).split(',')[0].trim()
  return fromForwarded || String(edgeIp || '').trim() || 'unknown'
}

export function parseDeviceInfo(userAgentRaw) {
  const userAgent = String(userAgentRaw || '').toLowerCase()

  let browser = 'Unknown'
  if (userAgent.includes('edg/')) browser = 'Edge'
  else if (userAgent.includes('opr/') || userAgent.includes('opera')) browser = 'Opera'
  else if (userAgent.includes('chrome/')) browser = 'Chrome'
  else if (userAgent.includes('safari/') && !userAgent.includes('chrome/')) browser = 'Safari'
  else if (userAgent.includes('firefox/')) browser = 'Firefox'

  let os = 'Unknown'
  if (userAgent.includes('windows')) os = 'Windows'
  else if (userAgent.includes('android')) os = 'Android'
  else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ios')) os = 'iOS'
  else if (userAgent.includes('mac os') || userAgent.includes('macintosh')) os = 'macOS'
  else if (userAgent.includes('linux')) os = 'Linux'

  let deviceType = 'desktop'
  if (userAgent.includes('ipad') || userAgent.includes('tablet')) deviceType = 'tablet'
  else if (userAgent.includes('mobile') || userAgent.includes('iphone') || userAgent.includes('android')) deviceType = 'mobile'

  return {
    browser,
    os,
    deviceType,
  }
}

export async function resolveIpLocation(ipAddress) {
  if (isPrivateOrUnknownIp(ipAddress)) {
    return { city: 'Unknown', country: 'Unknown' }
  }

  try {
    const response = await Promise.race([
      fetch(`https://ipapi.co/${encodeURIComponent(ipAddress)}/json/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
      new Promise((resolve) => {
        setTimeout(() => resolve({ ok: false }), 1700)
      }),
    ])

    if (!response || !response.ok) {
      return { city: 'Unknown', country: 'Unknown' }
    }

    const payload = await response.json().catch(() => ({}))
    return {
      city: toTitle(payload?.city, 'Unknown'),
      country: toTitle(payload?.country_name || payload?.country, 'Unknown'),
    }
  } catch {
    return { city: 'Unknown', country: 'Unknown' }
  }
}

function buildDedupeKey({ userEmail, action, ipAddress, severity, description }) {
  const parts = [toLower(userEmail), toLower(action), toLower(ipAddress), toLower(severity), String(description || '')]
  return simpleHash(parts.join('|'))
}

export async function logSuspiciousActivity({
  user,
  action,
  description,
  severity = 'LOW',
  request,
  dedupeWindowSeconds = 120,
  metadata = null,
}) {
  const safeAction = String(action || '').trim().toUpperCase()
  if (!safeAction) {
    return { logged: false, reason: 'Missing action' }
  }

  const safeSeverity = ['LOW', 'MEDIUM', 'HIGH'].includes(String(severity || '').toUpperCase())
    ? String(severity || '').toUpperCase()
    : 'LOW'

  const ipAddress = getRequestIpAddress(request)
  const userAgent = request?.headers?.get('user-agent') || ''
  const location = await resolveIpLocation(ipAddress)
  const device = parseDeviceInfo(userAgent)

  const dedupeKey = buildDedupeKey({
    userEmail: user?.email,
    action: safeAction,
    ipAddress,
    severity: safeSeverity,
    description,
  })

  const dedupePath = `${SUSPICIOUS_DEDUPE_COLLECTION}/${dedupeKey}`
  const existingDedupe = await firestore.getDoc(dedupePath).catch(() => null)
  const existingAt = Date.parse(String(existingDedupe?.lastLoggedAt || ''))
  if (Number.isFinite(existingAt)) {
    const elapsedSeconds = Math.floor((Date.now() - existingAt) / 1000)
    if (elapsedSeconds < Math.max(10, Number(dedupeWindowSeconds) || 120)) {
      return { logged: false, reason: 'Duplicate in dedupe window' }
    }
  }

  const entry = {
    userId: String(user?.uid || '').trim() || null,
    userName: String(user?.displayName || user?.name || '').trim() || 'Unknown User',
    userEmail: String(user?.email || '').trim().toLowerCase() || 'unknown',
    action: safeAction,
    description: String(description || safeAction),
    timestamp: nowIso(),
    ipAddress,
    location,
    device,
    severity: safeSeverity,
    reviewed: false,
    reviewedAt: null,
    reviewedBy: null,
    metadata: metadata || {},
  }

  const created = await firestore.addDoc(SUSPICIOUS_ACTIVITIES_COLLECTION, entry)
  await firestore.setDoc(dedupePath, { lastLoggedAt: entry.timestamp }, true)
  return { logged: true, entry: { id: created.id, ...entry } }
}

export async function detectRapidRepeatedActions({
  user,
  actionKey,
  request,
  threshold = 14,
  windowSeconds = 30,
  description,
}) {
  const uid = String(user?.uid || user?.email || '').trim()
  const key = String(actionKey || '').trim().toUpperCase()
  if (!uid || !key) {
    return { triggered: false }
  }

  const ratePath = `${SUSPICIOUS_RATE_COLLECTION}/${simpleHash(`${uid}:${key}`)}`
  const existing = await firestore.getDoc(ratePath).catch(() => null)
  const now = Date.now()
  const cutoff = now - Math.max(5, Number(windowSeconds) || 30) * 1000
  const history = Array.isArray(existing?.hits) ? existing.hits : []

  const nextHits = history
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value >= cutoff)
  nextHits.push(now)

  await firestore.setDoc(ratePath, {
    uid,
    actionKey: key,
    hits: nextHits,
    updatedAt: nowIso(),
  }, true)

  if (nextHits.length >= Math.max(3, Number(threshold) || 14)) {
    await logSuspiciousActivity({
      user,
      action: 'RAPID_REPEATED_ACTIONS',
      description: description || `Rapid repeated actions detected for ${key}.`,
      severity: 'MEDIUM',
      request,
      dedupeWindowSeconds: Math.max(30, Number(windowSeconds) || 30),
      metadata: {
        actionKey: key,
        hitCount: nextHits.length,
        windowSeconds: Math.max(5, Number(windowSeconds) || 30),
      },
    }).catch(() => null)

    return { triggered: true, hitCount: nextHits.length }
  }

  return { triggered: false, hitCount: nextHits.length }
}

export async function listSuspiciousActivities({
  page = 1,
  limit = 20,
  severity = '',
  user = '',
  from = '',
  to = '',
  search = '',
  includeAll = false,
}) {
  const all = await firestore.listDocs(SUSPICIOUS_ACTIVITIES_COLLECTION).catch(() => [])

  const severityFilter = String(severity || '').trim().toUpperCase()
  const userFilter = String(user || '').trim().toLowerCase()
  const fromMs = Date.parse(String(from || ''))
  const toMs = Date.parse(String(to || ''))
  const searchTerm = String(search || '').trim().toLowerCase()

  const filtered = all
    .map((entry) => ({
      ...entry,
      timestamp: entry?.timestamp || entry?.createdAt || null,
      location: entry?.location || { city: 'Unknown', country: 'Unknown' },
      device: entry?.device || { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' },
      severity: String(entry?.severity || 'LOW').toUpperCase(),
    }))
    .filter((entry) => {
      if (severityFilter && entry.severity !== severityFilter) return false

      if (userFilter) {
        const identity = `${String(entry.userName || '').toLowerCase()} ${String(entry.userEmail || '').toLowerCase()}`
        if (!identity.includes(userFilter)) return false
      }

      const entryMs = Date.parse(String(entry.timestamp || ''))
      if (Number.isFinite(fromMs) && (!Number.isFinite(entryMs) || entryMs < fromMs)) return false
      if (Number.isFinite(toMs) && (!Number.isFinite(entryMs) || entryMs > toMs + 24 * 60 * 60 * 1000 - 1)) return false

      if (searchTerm) {
        const bag = [
          entry.userName,
          entry.userEmail,
          entry.action,
          entry.description,
          entry.ipAddress,
          entry.location?.city,
          entry.location?.country,
          entry.device?.browser,
          entry.device?.os,
          entry.device?.deviceType,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ')

        if (!bag.includes(searchTerm)) return false
      }

      return true
    })
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))

  const total = filtered.length
  if (includeAll) {
    return {
      entries: filtered,
      pagination: {
        page: 1,
        limit: total,
        total,
        pages: 1,
      },
    }
  }

  const safeLimit = Math.min(100, Math.max(5, Number(limit) || 20))
  const safePage = Math.max(1, Number(page) || 1)
  const pages = Math.max(1, Math.ceil(total / safeLimit))
  const start = (safePage - 1) * safeLimit
  const entries = filtered.slice(start, start + safeLimit)

  return {
    entries,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages,
    },
  }
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function buildSuspiciousActivitiesCsv(entries = []) {
  const headers = [
    'ID',
    'User Name',
    'User Email',
    'Action',
    'Description',
    'Severity',
    'IP Address',
    'City',
    'Country',
    'Browser',
    'OS',
    'Device Type',
    'Timestamp',
    'Reviewed',
    'Reviewed At',
    'Reviewed By',
  ]

  const rows = entries.map((entry) => [
    entry.id || '',
    entry.userName || '',
    entry.userEmail || '',
    entry.action || '',
    entry.description || '',
    entry.severity || '',
    entry.ipAddress || '',
    entry.location?.city || 'Unknown',
    entry.location?.country || 'Unknown',
    entry.device?.browser || 'Unknown',
    entry.device?.os || 'Unknown',
    entry.device?.deviceType || 'desktop',
    entry.timestamp || '',
    entry.reviewed ? 'Yes' : 'No',
    entry.reviewedAt || '',
    entry.reviewedBy || '',
  ])

  return [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n')
}

export async function markSuspiciousActivityReviewed({ activityId, reviewer }) {
  const id = String(activityId || '').trim()
  if (!id) {
    throw new Error('Activity ID is required.')
  }

  await firestore.setDoc(`${SUSPICIOUS_ACTIVITIES_COLLECTION}/${id}`, {
    reviewed: true,
    reviewedAt: nowIso(),
    reviewedBy: String(reviewer?.email || reviewer?.uid || '').trim() || 'unknown',
  }, true)

  return { success: true }
}
