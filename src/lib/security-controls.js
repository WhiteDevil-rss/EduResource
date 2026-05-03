export const SECURITY_CONTROLS_DEFAULTS = {
  enable2FA: false,
  twoFAMethod: 'email',
  maxLoginAttempts: 5,
  lockDurationMinutes: 15,
  enableAlerts: true,
  maintenanceMode: false,
  maintenanceWhitelist: [],
}

export const SECURITY_CONTROLS_LIMITS = {
  minAttempts: 3,
  maxAttempts: 12,
  minLockMinutes: 5,
  maxLockMinutes: 120,
}

function toFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeSecurityControls(value) {
  const attempts = toFiniteNumber(value?.maxLoginAttempts)
  const lockMinutes = toFiniteNumber(value?.lockDurationMinutes)
  const twoFAMethod = String(value?.twoFAMethod || SECURITY_CONTROLS_DEFAULTS.twoFAMethod).toLowerCase()

  return {
    enable2FA: Boolean(value?.enable2FA),
    twoFAMethod: twoFAMethod === 'authenticator' ? 'authenticator' : 'email',
    maxLoginAttempts:
      attempts && attempts >= SECURITY_CONTROLS_LIMITS.minAttempts
        ? Math.min(Math.round(attempts), SECURITY_CONTROLS_LIMITS.maxAttempts)
        : SECURITY_CONTROLS_DEFAULTS.maxLoginAttempts,
    lockDurationMinutes:
      lockMinutes && lockMinutes >= SECURITY_CONTROLS_LIMITS.minLockMinutes
        ? Math.min(Math.round(lockMinutes), SECURITY_CONTROLS_LIMITS.maxLockMinutes)
        : SECURITY_CONTROLS_DEFAULTS.lockDurationMinutes,
    enableAlerts: value?.enableAlerts !== false,
    maintenanceMode: Boolean(value?.maintenanceMode),
    maintenanceWhitelist: Array.isArray(value?.maintenanceWhitelist)
      ? value.maintenanceWhitelist.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
      : [],
    updatedAt: value?.updatedAt || null,
    updatedBy: value?.updatedBy || null,
  }
}

export function validateSecurityControls(value) {
  const settings = normalizeSecurityControls(value)

  if (!settings.enable2FA && !settings.enableAlerts) {
    throw new Error('At least one advanced protection (2FA or alerts) must stay enabled.')
  }

  if (
    settings.maxLoginAttempts < SECURITY_CONTROLS_LIMITS.minAttempts ||
    settings.maxLoginAttempts > SECURITY_CONTROLS_LIMITS.maxAttempts
  ) {
    throw new Error(
      `Max login attempts must be between ${SECURITY_CONTROLS_LIMITS.minAttempts} and ${SECURITY_CONTROLS_LIMITS.maxAttempts}.`
    )
  }

  if (
    settings.lockDurationMinutes < SECURITY_CONTROLS_LIMITS.minLockMinutes ||
    settings.lockDurationMinutes > SECURITY_CONTROLS_LIMITS.maxLockMinutes
  ) {
    throw new Error(
      `Lock duration must be between ${SECURITY_CONTROLS_LIMITS.minLockMinutes} and ${SECURITY_CONTROLS_LIMITS.maxLockMinutes} minutes.`
    )
  }

  return settings
}
