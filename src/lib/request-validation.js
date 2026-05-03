import 'server-only'
import { ApiError } from '@/lib/api-security'

const HTML_TAG_REGEX = /<[^>]*>/g
const COLLAPSE_WHITESPACE_REGEX = /\s+/g
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

function removeControlCharacters(value) {
  return String(value || '')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      return code <= 31 || code === 127 ? ' ' : char
    })
    .join('')
}

export function sanitizePlainText(value, { maxLength = 2000, collapseWhitespace = false } = {}) {
  const withoutControls = removeControlCharacters(value)
  const withoutTags = withoutControls.replace(HTML_TAG_REGEX, ' ')
  const base = collapseWhitespace
    ? withoutTags.replace(COLLAPSE_WHITESPACE_REGEX, ' ').trim()
    : withoutTags.trim()

  return base.slice(0, Math.max(0, Number(maxLength) || 0))
}

/**
 * Request Validation Utilities
 * Provides input validation and sanitization for API endpoints
 */

/**
 * Validates and sanitizes email
 * @param {string} email - Email to validate
 * @param {boolean} required - Whether email is required
 * @returns {string|null} Normalized email or null
 */
export function validateEmail(email, required = true) {
  const trimmed = String(email || '').trim().toLowerCase()

  if (!trimmed && required) {
    throw new ApiError(400, 'Email is required.')
  }

  if (!trimmed) {
    return null
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    throw new ApiError(400, 'Invalid email format.')
  }

  if (trimmed.length > 254) {
    throw new ApiError(400, 'Email is too long.')
  }

  return trimmed
}

/**
 * Validates and sanitizes login ID
 * @param {string} loginId - Login ID to validate
 * @param {boolean} required - Whether ID is required
 * @returns {string|null} Normalized login ID or null
 */
export function validateLoginId(loginId, required = true) {
  const trimmed = String(loginId || '').trim().toLowerCase()

  if (!trimmed && required) {
    throw new ApiError(400, 'Login ID is required.')
  }

  if (!trimmed) {
    return null
  }

  if (trimmed.length < 3) {
    throw new ApiError(400, 'Login ID must be at least 3 characters.')
  }

  if (trimmed.length > 50) {
    throw new ApiError(400, 'Login ID must not exceed 50 characters.')
  }

  const validChars = /^[a-z0-9.]+$/
  if (!validChars.test(trimmed)) {
    throw new ApiError(
      400,
      'Login ID can only contain lowercase letters, numbers, and periods.'
    )
  }

  return trimmed
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @param {boolean} required - Whether password is required
 * @returns {boolean} True if valid
 */
export function validatePassword(password, required = true) {
  const pwd = String(password || '')

  if (!pwd && required) {
    throw new ApiError(400, 'Password is required.')
  }

  if (!pwd) {
    return true
  }

  if (pwd.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters.')
  }

  if (pwd.length > 256) {
    throw new ApiError(400, 'Password is too long.')
  }

  if (!PASSWORD_COMPLEXITY_REGEX.test(pwd)) {
    throw new ApiError(
      400,
      'Password must include uppercase, lowercase, number, and special character.'
    )
  }

  return true
}

/**
 * Validates display name
 * @param {string} displayName - Name to validate
 * @param {boolean} required - Whether name is required
 * @returns {string|null} Sanitized name or null
 */
export function validateDisplayName(displayName, required = false) {
  const trimmed = sanitizePlainText(displayName, {
    maxLength: 100,
    collapseWhitespace: true,
  })

  if (!trimmed && required) {
    throw new ApiError(400, 'Display name is required.')
  }

  if (!trimmed) {
    return null
  }

  // Allow letters, numbers, spaces, and common special characters
  const validChars = /^[a-zA-Z0-9\s\-'.]+$/
  if (!validChars.test(trimmed)) {
    throw new ApiError(
      400,
      'Display name contains invalid characters.'
    )
  }

  return trimmed
}

/**
 * Validates user role
 * @param {string} role - Role to validate
 * @returns {string} Validated role
 */
export function validateRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  const validRoles = ['admin', 'faculty', 'student']

  if (!validRoles.includes(normalized)) {
    throw new ApiError(
      400,
      `Invalid role. Must be one of: ${validRoles.join(', ')}`
    )
  }

  return normalized
}

/**
 * Validates user status
 * @param {string} status - Status to validate
 * @returns {string} Validated status
 */
export function validateStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()
  const validStatuses = ['active', 'disabled']

  if (!validStatuses.includes(normalized)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    )
  }

  return normalized
}

/**
 * Validates UUID format
 * @param {string} uuid - UUID to validate
 * @returns {string} Validated UUID
 */
export function validateUuid(uuid) {
  const id = String(uuid || '').trim()

  if (!id) {
    throw new ApiError(400, 'ID is required.')
  }

  if (id.length < 3 || id.length > 256) {
    throw new ApiError(400, 'Invalid ID format.')
  }

  return id
}

/**
 * Validates URL
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether URL is required
 * @returns {string|null} Validated URL or null
 */
export function validateUrl(url, required = true) {
  const trimmed = String(url || '').trim()

  if (!trimmed && required) {
    throw new ApiError(400, 'URL is required.')
  }

  if (!trimmed) {
    return null
  }

  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ApiError(400, 'URL must use HTTP or HTTPS protocol.')
    }
    return trimmed
  } catch {
    throw new ApiError(400, 'Invalid URL format.')
  }
}

/**
 * Validates text field (general purpose)
 * @param {string} text - Text to validate
 * @param {object} options - Validation options
 * @returns {string|null} Validated text or null
 */
export function validateTextField(
  text,
  options = {}
) {
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    fieldName = 'Text',
  } = options

  const trimmed = sanitizePlainText(text, {
    maxLength,
    collapseWhitespace: true,
  })

  if (!trimmed && required) {
    throw new ApiError(400, `${fieldName} is required.`)
  }

  if (!trimmed) {
    return null
  }

  if (trimmed.length < minLength) {
    throw new ApiError(
      400,
      `${fieldName} must be at least ${minLength} characters.`
    )
  }

  return trimmed
}

export function validateSearchTerm(term, maxLength = 160) {
  return sanitizePlainText(term, {
    maxLength,
    collapseWhitespace: true,
  }).toLowerCase()
}

export function validateOtpCode(value) {
  const otp = String(value || '').trim()
  if (!/^\d{4,8}$/.test(otp)) {
    throw new ApiError(400, 'OTP must be a 4 to 8 digit code.')
  }
  return otp
}

export function validateChallengeId(value) {
  const challengeId = String(value || '').trim()
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(challengeId)) {
    throw new ApiError(400, 'Invalid challenge identifier.')
  }
  return challengeId
}

export function sanitizeFileName(fileName) {
  const normalized = sanitizePlainText(fileName, {
    maxLength: 120,
    collapseWhitespace: true,
  })
  const safe = normalized
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe || 'upload'
}

/**
 * Validates and parses JSON from request body
 * @param {Request} request - Next.js request object
 * @returns {object} Parsed JSON
 */
export async function parseAndValidateJson(request) {
  if (!request.body) {
    throw new ApiError(400, 'Request body is required.')
  }

  try {
    return await request.json()
  } catch {
    throw new ApiError(400, 'Invalid JSON in request body.')
  }
}

/**
 * Validates request headers for security
 * @param {Request} request - Next.js request object
 * @returns {boolean} True if headers are valid
 */
export function validateRequestHeaders(request) {
  const contentType = request.headers.get('content-type')

  // For POST/PUT/PATCH, JSON is expected
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType?.includes('application/json')) {
      throw new ApiError(400, 'Content-Type must be application/json.')
    }
  }

  return true
}

/**
 * Validates pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {object} Validated pagination params
 */
export function validatePagination(page = 1, limit = 20) {
  let p = parseInt(page, 10)
  let l = parseInt(limit, 10)

  if (isNaN(p) || p < 1) p = 1
  if (isNaN(l) || l < 1) l = 20
  if (l > 100) l = 100

  return { page: p, limit: l }
}

/**
 * Sanitizes object by removing dangerous fields
 * @param {object} obj - Object to sanitize
 * @param {string[]} dangerousFields - Fields to remove
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj, dangerousFields = []) {
  const sanitized = { ...obj }

  dangerousFields.forEach((field) => {
    delete sanitized[field]
  })

  return sanitized
}
