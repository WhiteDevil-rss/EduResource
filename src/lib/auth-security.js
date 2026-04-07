import 'server-only'
import { firestore } from '@/lib/firebase-edge'
import { listUserRecords } from '@/lib/server-data'
import {
  SECURITY_CONTROLS_DEFAULTS,
  normalizeSecurityControls,
  validateSecurityControls,
} from '@/lib/security-controls'
import {
  logSuspiciousActivity,
  resolveIpLocation,
  getRequestIpAddress,
} from '@/lib/suspicious-activity'
import { isSuperAdmin } from '@/lib/admin-protection'

const APP_CONFIG_COLLECTION = 'app_config'
const SECURITY_CONTROLS_DOC_ID = 'security_controls'
const LOGIN_ATTEMPTS_COLLECTION = 'login_attempts'
const TWO_FACTOR_CHALLENGES_COLLECTION = 'two_factor_challenges'
const LOGIN_DEVICE_PROFILES_COLLECTION = 'login_device_profiles'
const NOTIFICATIONS_COLLECTION = 'notifications'

function nowIso() {
  return new Date().toISOString()
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_')
}

function getRequestIp(request) {
  const forwarded = request?.headers?.get('x-forwarded-for') || ''
  return String(forwarded).split(',')[0].trim() || 'unknown'
}

function getUserAgent(request) {
  return request?.headers?.get('user-agent') || 'unknown'
}

function randomSixDigitOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function getSecurityControlsRecord() {
  const existing = await firestore
    .getDoc(`${APP_CONFIG_COLLECTION}/${SECURITY_CONTROLS_DOC_ID}`)
    .catch(() => null)

  if (!existing) {
    return {
      ...SECURITY_CONTROLS_DEFAULTS,
      updatedAt: null,
      updatedBy: null,
    }
  }

  return normalizeSecurityControls(existing)
}

export async function upsertSecurityControlsRecord({ settings, actorUid }) {
  const validated = validateSecurityControls(settings)
  const payload = {
    ...validated,
    updatedAt: nowIso(),
    updatedBy: String(actorUid || '').trim() || null,
  }

  await firestore.setDoc(`${APP_CONFIG_COLLECTION}/${SECURITY_CONTROLS_DOC_ID}`, payload, true)
  return normalizeSecurityControls(payload)
}

export async function getLoginAttemptRecord(identifier) {
  const key = normalizeIdentifier(identifier)
  if (!key) return null

  const record = await firestore.getDoc(`${LOGIN_ATTEMPTS_COLLECTION}/${key}`).catch(() => null)
  return record || null
}

export async function isLoginLocked(identifier) {
  const record = await getLoginAttemptRecord(identifier)
  if (!record?.lockedUntil) {
    return { locked: false, lockedUntil: null, attempts: Number(record?.attempts || 0) }
  }

  const lockedUntilTs = Date.parse(String(record.lockedUntil))
  if (!Number.isFinite(lockedUntilTs) || Date.now() >= lockedUntilTs) {
    return { locked: false, lockedUntil: null, attempts: Number(record?.attempts || 0) }
  }

  return { locked: true, lockedUntil: record.lockedUntil, attempts: Number(record?.attempts || 0) }
}

export async function recordFailedLoginAttempt({ identifier, maxLoginAttempts, lockDurationMinutes, request }) {
  const key = normalizeIdentifier(identifier)
  if (!key) return { attempts: 0, lockedUntil: null, locked: false }

  const existing = await getLoginAttemptRecord(key)
  const attempts = Number(existing?.attempts || 0) + 1
  const shouldLock = attempts >= Math.max(1, Number(maxLoginAttempts) || 5)
  const lockedUntil = shouldLock
    ? new Date(Date.now() + Math.max(1, Number(lockDurationMinutes) || 15) * 60 * 1000).toISOString()
    : null

  const next = {
    identifier: key,
    attempts,
    lockedUntil,
    lastFailedAt: nowIso(),
    lastIp: getRequestIp(request),
    lastUserAgent: getUserAgent(request),
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${LOGIN_ATTEMPTS_COLLECTION}/${key}`, next, true)

  if (shouldLock) {
    await logSuspiciousActivity({
      user: { email: identifier || key },
      action: 'MULTIPLE_ATTEMPTS',
      description: `Multiple failed login attempts exceeded threshold (${attempts}/${Math.max(1, Number(maxLoginAttempts) || 5)}).`,
      severity: 'HIGH',
      request,
      dedupeWindowSeconds: Math.max(30, Number(lockDurationMinutes) || 15) * 60,
      metadata: {
        attempts,
        maxLoginAttempts: Math.max(1, Number(maxLoginAttempts) || 5),
      },
    }).catch(() => null)
  }

  return { attempts, lockedUntil, locked: Boolean(lockedUntil) }
}

export async function clearFailedLoginAttempts(identifier) {
  const key = normalizeIdentifier(identifier)
  if (!key) return
  await firestore.deleteDoc(`${LOGIN_ATTEMPTS_COLLECTION}/${key}`).catch(() => null)
}

export async function createTwoFactorChallenge({ user, method = 'email', request, ttlMinutes = 5 }) {
  const challengeId = crypto.randomUUID()
  const otp = randomSixDigitOtp()
  const expiresAt = new Date(Date.now() + Math.max(1, Number(ttlMinutes) || 5) * 60 * 1000).toISOString()

  const payload = {
    challengeId,
    uid: user?.uid || null,
    email: String(user?.email || '').toLowerCase(),
    role: user?.role || null,
    name: user?.displayName || user?.name || null,
    status: user?.status || 'active',
    authProvider: 'credentials',
    method: method === 'authenticator' ? 'authenticator' : 'email',
    otp,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    createdAt: nowIso(),
    createdIp: getRequestIp(request),
    createdUserAgent: getUserAgent(request),
    usedAt: null,
  }

  await firestore.setDoc(`${TWO_FACTOR_CHALLENGES_COLLECTION}/${challengeId}`, payload, true)

  // In production, integrate SMTP/provider. Current fallback is in-app notification.
  await firestore.addDoc(NOTIFICATIONS_COLLECTION, {
    recipientUid: user?.uid || null,
    type: 'security.otp',
    message: `Your security verification code is ${otp}. It expires in ${ttlMinutes} minutes.`,
    readAt: null,
    createdAt: nowIso(),
  }).catch(() => null)

  return {
    challengeId,
    expiresAt,
    method: payload.method,
    ...(process.env.NODE_ENV !== 'production' ? { otpPreview: otp } : {}),
  }
}

export async function verifyTwoFactorChallenge({ challengeId, otp }) {
  const id = String(challengeId || '').trim()
  const code = String(otp || '').trim()
  if (!id || !code) {
    throw new Error('Challenge ID and OTP are required.')
  }

  const challenge = await firestore.getDoc(`${TWO_FACTOR_CHALLENGES_COLLECTION}/${id}`).catch(() => null)
  if (!challenge) {
    throw new Error('Invalid or expired verification challenge.')
  }

  if (challenge.usedAt) {
    throw new Error('This verification code was already used.')
  }

  const expiresAt = Date.parse(String(challenge.expiresAt || ''))
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    throw new Error('Verification code expired. Please request a new code.')
  }

  const attempts = Number(challenge.attempts || 0)
  const maxAttempts = Number(challenge.maxAttempts || 5)
  if (attempts >= maxAttempts) {
    throw new Error('Too many incorrect code attempts. Please sign in again.')
  }

  if (String(challenge.otp) !== code) {
    await firestore
      .setDoc(
        `${TWO_FACTOR_CHALLENGES_COLLECTION}/${id}`,
        {
          attempts: attempts + 1,
          updatedAt: nowIso(),
        },
        true
      )
      .catch(() => null)
    throw new Error('Incorrect verification code.')
  }

  await firestore
    .setDoc(
      `${TWO_FACTOR_CHALLENGES_COLLECTION}/${id}`,
      {
        usedAt: nowIso(),
        updatedAt: nowIso(),
      },
      true
    )
    .catch(() => null)

  return {
    uid: challenge.uid,
    email: challenge.email,
    role: challenge.role,
    name: challenge.name,
    status: challenge.status || 'active',
    authProvider: challenge.authProvider || 'credentials',
  }
}

export async function resendTwoFactorChallenge({ challengeId, ttlMinutes = 5 }) {
  const id = String(challengeId || '').trim()
  if (!id) {
    throw new Error('Challenge ID is required.')
  }

  const challenge = await firestore.getDoc(`${TWO_FACTOR_CHALLENGES_COLLECTION}/${id}`).catch(() => null)
  if (!challenge) {
    throw new Error('Verification challenge not found.')
  }

  if (challenge.usedAt) {
    throw new Error('This verification challenge is already completed.')
  }

  const otp = randomSixDigitOtp()
  const expiresAt = new Date(Date.now() + Math.max(1, Number(ttlMinutes) || 5) * 60 * 1000).toISOString()

  await firestore.setDoc(
    `${TWO_FACTOR_CHALLENGES_COLLECTION}/${id}`,
    {
      otp,
      expiresAt,
      attempts: 0,
      updatedAt: nowIso(),
    },
    true
  )

  await firestore.addDoc(NOTIFICATIONS_COLLECTION, {
    recipientUid: challenge.uid || null,
    type: 'security.otp',
    message: `Your new security verification code is ${otp}. It expires in ${ttlMinutes} minutes.`,
    readAt: null,
    createdAt: nowIso(),
  }).catch(() => null)

  return {
    challengeId: id,
    expiresAt,
    ...(process.env.NODE_ENV !== 'production' ? { otpPreview: otp } : {}),
  }
}

export async function emitSuspiciousActivityAlert({ user, reason, request }) {
  const users = await listUserRecords().catch(() => [])
  const superAdmins = users.filter((entry) => isSuperAdmin(entry))
  const message = `${reason} for ${user?.email || 'unknown user'} (IP: ${getRequestIp(request)})`

  await Promise.all(
    superAdmins.map((admin) =>
      firestore.addDoc(NOTIFICATIONS_COLLECTION, {
        recipientUid: admin.uid,
        type: 'security.alert',
        message,
        readAt: null,
        createdAt: nowIso(),
      })
    )
  ).catch(() => null)
}

export async function detectNewDeviceAndAlert({ user, request, alertsEnabled }) {
  if (!user?.uid || !alertsEnabled) return

  const deviceKey = String(user.uid).trim()
  const currentIpAddress = getRequestIpAddress(request)
  const currentFingerprint = `${currentIpAddress}|${getUserAgent(request)}`
  const currentLocation = await resolveIpLocation(currentIpAddress).catch(() => ({ city: 'Unknown', country: 'Unknown' }))
  const existing = await firestore.getDoc(`${LOGIN_DEVICE_PROFILES_COLLECTION}/${deviceKey}`).catch(() => null)

  if (!existing?.lastFingerprint) {
    await firestore.setDoc(
      `${LOGIN_DEVICE_PROFILES_COLLECTION}/${deviceKey}`,
      {
        uid: user.uid,
        email: String(user.email || '').toLowerCase(),
        lastFingerprint: currentFingerprint,
        lastIp: currentIpAddress,
        lastUserAgent: getUserAgent(request),
        lastLocation: currentLocation,
        updatedAt: nowIso(),
      },
      true
    )
    return
  }

  if (existing.lastFingerprint !== currentFingerprint) {
    await logSuspiciousActivity({
      user,
      action: 'NEW_DEVICE_LOGIN',
      description: 'Login detected from a new device fingerprint.',
      severity: 'MEDIUM',
      request,
      dedupeWindowSeconds: 180,
      metadata: {
        previousIp: existing.lastIp || 'unknown',
        currentIp: currentIpAddress,
      },
    }).catch(() => null)

    await emitSuspiciousActivityAlert({
      user,
      reason: 'Login from a new device/location detected',
      request,
    })
  }

  const previousCountry = String(existing?.lastLocation?.country || '').trim().toLowerCase()
  const currentCountry = String(currentLocation?.country || '').trim().toLowerCase()
  if (
    previousCountry &&
    currentCountry &&
    previousCountry !== 'unknown' &&
    currentCountry !== 'unknown' &&
    previousCountry !== currentCountry
  ) {
    await logSuspiciousActivity({
      user,
      action: 'UNUSUAL_LOCATION_LOGIN',
      description: `Login location changed from ${existing.lastLocation.country} to ${currentLocation.country}.`,
      severity: 'MEDIUM',
      request,
      dedupeWindowSeconds: 300,
      metadata: {
        previousLocation: existing.lastLocation,
        currentLocation,
      },
    }).catch(() => null)
  }

  await firestore.setDoc(
    `${LOGIN_DEVICE_PROFILES_COLLECTION}/${deviceKey}`,
    {
      lastFingerprint: currentFingerprint,
      lastIp: currentIpAddress,
      lastUserAgent: getUserAgent(request),
      lastLocation: currentLocation,
      updatedAt: nowIso(),
    },
    true
  )
}
