/**
 * Format a timestamp to Indian Standard Time (IST)
 * @param {string|Date|number} timestamp - The timestamp to format
 * @param {string} fallback - Fallback string if timestamp is invalid
 * @returns {string} Formatted date string in IST (e.g., "08 Apr 2026, 09:42:15 PM")
 */
export function formatISTDate(timestamp, fallback = 'Invalid date') {
  if (!timestamp) {
    return fallback
  }

  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return fallback
  }
}

/**
 * Format a timestamp to IST without time (date only)
 * @param {string|Date|number} timestamp - The timestamp to format
 * @param {string} fallback - Fallback string if timestamp is invalid
 * @returns {string} Formatted date string in IST (e.g., "08 Apr 2026")
 */
export function formatISTDateOnly(timestamp, fallback = 'Invalid date') {
  if (!timestamp) {
    return fallback
  }

  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return fallback
  }
}

/**
 * Format a timestamp to IST time only (no date)
 * @param {string|Date|number} timestamp - The timestamp to format
 * @param {string} fallback - Fallback string if timestamp is invalid
 * @returns {string} Formatted time string in IST (e.g., "09:42:15 PM")
 */
export function formatISTTimeOnly(timestamp, fallback = 'Invalid time') {
  if (!timestamp) {
    return fallback
  }

  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return fallback
  }
}

/**
 * Format a timestamp to IST in compact format (no seconds)
 * @param {string|Date|number} timestamp - The timestamp to format
 * @param {string} fallback - Fallback string if timestamp is invalid
 * @returns {string} Formatted date string in IST (e.g., "08 Apr 2026, 09:42 PM")
 */
export function formatISTCompact(timestamp, fallback = 'Invalid date') {
  if (!timestamp) {
    return fallback
  }

  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return fallback
  }
}
