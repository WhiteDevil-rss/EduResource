/* global TextEncoder, btoa, atob */
import 'server-only'

/**
 * Edge-compatible session cookie management using Web Crypto API.
 */

const DEV_SESSION_SECRET = 'codex-dev-session-secret'

function getSessionSecret() {
  return process.env.SESSION_SECRET || DEV_SESSION_SECRET
}

/**
 * Base64URL encoding/decoding helpers (Edge safe)
 */
function toBase64Url(str) {
  const base64 = btoa(str)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  return atob(base64 + padding)
}

/**
 * HMAC SHA-256 Signing using Web Crypto API
 */
async function sign(value) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(getSessionSecret())
  const data = encoder.encode(value)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, data)
  const hashArray = Array.from(new Uint8Array(signature))
  const hashString = hashArray.map(b => String.fromCharCode(b)).join('')
  return toBase64Url(hashString)
}

/**
 * HMAC SHA-256 Verification using Web Crypto API
 */
async function verify(value, signature) {
  const expectedSignature = await sign(value)
  return expectedSignature === signature
}

export async function createSessionCookie(payload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = await sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export async function readSessionCookie(cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) {
    return null
  }

  const [encodedPayload, signature] = cookieValue.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const isValid = await verify(encodedPayload, signature)
  if (!isValid) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload))

    if (!payload?.uid || !payload?.role || !payload?.exp) {
      return null
    }

    if (Date.now() > payload.exp) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
