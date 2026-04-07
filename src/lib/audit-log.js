import 'server-only'
import { createAuditRecord } from '@/lib/server-data'

const locationCache = new Map()
const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000

function normalizeIp(ip) {
  return String(ip || '')
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '')
}

function isPrivateIp(ip) {
  if (!ip) return true
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  )
}

function parseDeviceType(ua) {
  const lower = String(ua || '').toLowerCase()
  if (/ipad|tablet/.test(lower)) return 'tablet'
  if (/mobi|android|iphone/.test(lower)) return 'mobile'
  return 'desktop'
}

function parseBrowser(ua) {
  const value = String(ua || '')
  if (/Edg\//.test(value)) return 'Edge'
  if (/Chrome\//.test(value) && !/Edg\//.test(value)) return 'Chrome'
  if (/Safari\//.test(value) && !/Chrome\//.test(value)) return 'Safari'
  if (/Firefox\//.test(value)) return 'Firefox'
  return 'Unknown'
}

function parseOs(ua) {
  const value = String(ua || '')
  if (/Windows NT/.test(value)) return 'Windows'
  if (/Mac OS X|Macintosh/.test(value)) return 'macOS'
  if (/Android/.test(value)) return 'Android'
  if (/iPhone|iPad|iPod/.test(value)) return 'iOS'
  if (/Linux/.test(value)) return 'Linux'
  return 'Unknown'
}

export function getRequestIp(request) {
  if (!request?.headers) {
    return null
  }

  return normalizeIp(
    request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-client-ip') ||
      null
  )
}

async function resolveLocationByIp(ip) {
  if (!ip || isPrivateIp(ip)) {
    return 'Unknown'
  }

  const cached = locationCache.get(ip)
  if (cached && Date.now() - cached.at < LOCATION_CACHE_TTL_MS) {
    return cached.location
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    const city = String(payload?.city || '').trim()
    const country = String(payload?.country_name || payload?.country || '').trim()
    const location = [city, country].filter(Boolean).join(', ') || 'Unknown'

    locationCache.set(ip, { location, at: Date.now() })
    return location
  } catch {
    return 'Unknown'
  }
}

export async function logAction({
  user,
  action,
  description,
  module,
  status = 'SUCCESS',
  request,
  targetId = null,
  targetRole = null,
  metadata = null,
}) {
  const userAgent = request?.headers?.get('user-agent') || ''
  const ipAddress = getRequestIp(request)
  const location = await resolveLocationByIp(ipAddress)

  await createAuditRecord({
    userId: user?.uid || null,
    userName: user?.name || user?.displayName || null,
    userEmail: user?.email || null,
    role: user?.role || null,
    action,
    description,
    module,
    status,
    ipAddress,
    location,
    device: {
      browser: parseBrowser(userAgent),
      os: parseOs(userAgent),
      deviceType: parseDeviceType(userAgent),
    },
    targetId,
    targetRole,
    message: description,
    metadata,
  })
}
