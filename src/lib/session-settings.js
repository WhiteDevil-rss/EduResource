export const SESSION_SETTINGS_DEFAULTS = {
  inactivityTimeout: 5 * 60 * 1000,
  warningTimeout: 4 * 60 * 1000,
  maxSessionTimeout: 30 * 60 * 1000,
};

export const SESSION_SETTINGS_LIMITS = {
  minMs: 60 * 1000,
  maxMs: 24 * 60 * 60 * 1000,
};

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSessionSettings(value) {
  const inactivityTimeout = toFiniteNumber(value?.inactivityTimeout);
  const warningTimeout = toFiniteNumber(value?.warningTimeout);
  const maxSessionTimeout = toFiniteNumber(value?.maxSessionTimeout);

  const normalized = {
    inactivityTimeout:
      inactivityTimeout && inactivityTimeout >= SESSION_SETTINGS_LIMITS.minMs
        ? Math.min(inactivityTimeout, SESSION_SETTINGS_LIMITS.maxMs)
        : SESSION_SETTINGS_DEFAULTS.inactivityTimeout,
    warningTimeout:
      warningTimeout && warningTimeout >= SESSION_SETTINGS_LIMITS.minMs
        ? Math.min(warningTimeout, SESSION_SETTINGS_LIMITS.maxMs)
        : SESSION_SETTINGS_DEFAULTS.warningTimeout,
    maxSessionTimeout:
      maxSessionTimeout && maxSessionTimeout >= SESSION_SETTINGS_LIMITS.minMs
        ? Math.min(maxSessionTimeout, SESSION_SETTINGS_LIMITS.maxMs)
        : SESSION_SETTINGS_DEFAULTS.maxSessionTimeout,
  };

  if (normalized.warningTimeout >= normalized.inactivityTimeout) {
    normalized.warningTimeout = Math.max(
      SESSION_SETTINGS_LIMITS.minMs,
      normalized.inactivityTimeout - SESSION_SETTINGS_LIMITS.minMs
    );
  }

  if (normalized.maxSessionTimeout < normalized.inactivityTimeout) {
    normalized.maxSessionTimeout = normalized.inactivityTimeout;
  }

  return normalized;
}

export function areSessionSettingsEqual(left, right) {
  const a = normalizeSessionSettings(left);
  const b = normalizeSessionSettings(right);

  return (
    a.inactivityTimeout === b.inactivityTimeout &&
    a.warningTimeout === b.warningTimeout &&
    a.maxSessionTimeout === b.maxSessionTimeout
  );
}

export function minutesToMs(minutes) {
  return Math.round(Number(minutes) * 60 * 1000);
}

export function msToMinutes(milliseconds) {
  return Number(milliseconds) / (60 * 1000);
}
