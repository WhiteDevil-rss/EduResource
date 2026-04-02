import 'server-only'
import crypto from 'node:crypto'

const DEV_SESSION_SECRET = 'codex-dev-session-secret'

function getSessionSecret() {
  return process.env.SESSION_SECRET || DEV_SESSION_SECRET
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url')
}

export function createSessionCookie(payload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function readSessionCookie(cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) {
    return null
  }

  const [encodedPayload, signature] = cookieValue.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = sign(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
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
