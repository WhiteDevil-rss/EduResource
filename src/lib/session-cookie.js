import 'server-only'

const DEV_SESSION_SECRET = 'codex-dev-session-secret'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function getSessionSecret() {
  return process.env.SESSION_SECRET || DEV_SESSION_SECRET
}

function toBase64Url(value) {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return atob(padded)
}

async function sign(value) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value))
  return toBase64Url(String.fromCharCode(...new Uint8Array(signature)))
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

  const expectedSignature = await sign(encodedPayload)
  if (signature.length !== expectedSignature.length) {
    return null
  }

  let mismatch = 0
  for (let index = 0; index < signature.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expectedSignature.charCodeAt(index)
  }

  if (mismatch !== 0) {
    return null
  }

  try {
    const payload = JSON.parse(textDecoder.decode(Uint8Array.from(fromBase64Url(encodedPayload), (char) => char.charCodeAt(0))))

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
