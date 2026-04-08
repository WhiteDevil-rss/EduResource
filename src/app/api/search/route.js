import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { listResourceRecords, listUserRecords } from '@/lib/server-data'
import { detectRapidRepeatedActions } from '@/lib/suspicious-activity'
import { sanitizePlainText, validateSearchTerm } from '@/lib/request-validation'

function normalizeSearchTerm(term) {
  return String(term || '').trim().toLowerCase()
}

function matchesSearchTerm(searchTerm, ...fields) {
  if (!searchTerm) return true
  const normalized = normalizeSearchTerm(searchTerm)
  return fields
    .map((field) => normalizeSearchTerm(String(field || '')))
    .some((field) => field.includes(normalized))
}

function extractSuggestions(items, searchTerm, maxCount = 10) {
  if (!searchTerm) return []
  
  const normalized = normalizeSearchTerm(searchTerm)
  const suggestions = new Set()

  items.forEach((item) => {
    // Add matching titles
    if (normalizeSearchTerm(item.title || '').includes(normalized)) {
      suggestions.add(item.title)
    }
    // Add matching subjects
    if (item.subject && normalizeSearchTerm(item.subject).includes(normalized)) {
      suggestions.add(item.subject)
    }
    // Add matching classes
    if (item.class && normalizeSearchTerm(item.class).includes(normalized)) {
      suggestions.add(item.class)
    }
    // Add matching names (for users)
    if (item.displayName && normalizeSearchTerm(item.displayName).includes(normalized)) {
      suggestions.add(item.displayName)
    }
    // Add matching emails
    if (item.email && normalizeSearchTerm(item.email).includes(normalized)) {
      suggestions.add(item.email.split('@')[0])
    }
  })

  return Array.from(suggestions).slice(0, maxCount)
}

function sortResults(items, sortBy = 'newest') {
  const sorted = [...items]

  switch (String(sortBy || '').toLowerCase()) {
    case 'oldest':
      return sorted.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
    case 'a-z':
      return sorted.sort((a, b) => String(a.title || a.displayName || '').localeCompare(String(b.title || b.displayName || '')))
    case 'z-a':
      return sorted.sort((a, b) => String(b.title || b.displayName || '').localeCompare(String(a.title || a.displayName || '')))
    case 'most-downloaded':
      return sorted.sort((a, b) => (Number(b.downloads || 0) || 0) - (Number(a.downloads || 0) || 0))
    case 'newest':
    default:
      return sorted.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }
}

function paginateResults(items, page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const total = items.length
  const start = (safePage - 1) * safeLimit
  const entries = items.slice(start, start + safeLimit)

  return {
    entries,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  }
}

export async function GET(request) {
  try {
    const session = await requireApiSession(request)
    const { searchParams } = new URL(request.url)

    const q = validateSearchTerm(searchParams.get('q') || '', 160)
    const requestedType = sanitizePlainText(searchParams.get('type') || 'resources', { maxLength: 20, collapseWhitespace: true }).toLowerCase()
    const type = ['resources', 'users', 'all'].includes(requestedType) ? requestedType : 'resources'
    const resourceClass = sanitizePlainText(searchParams.get('class') || '', { maxLength: 80, collapseWhitespace: true })
    const resourceSubject = sanitizePlainText(searchParams.get('subject') || '', { maxLength: 80, collapseWhitespace: true })
    const userRole = sanitizePlainText(searchParams.get('role') || '', { maxLength: 20, collapseWhitespace: true }).toLowerCase()
    const userStatus = sanitizePlainText(searchParams.get('status') || '', { maxLength: 20, collapseWhitespace: true }).toLowerCase()
    const requestedSortBy = sanitizePlainText(searchParams.get('sort') || 'newest', { maxLength: 30, collapseWhitespace: true }).toLowerCase()
    const sortBy = ['newest', 'oldest', 'a-z', 'z-a', 'most-downloaded'].includes(requestedSortBy)
      ? requestedSortBy
      : 'newest'
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 20)

    const items = []
    const suggestions = []

    if (['resources', 'all'].includes(type)) {
      const resources = await listResourceRecords()
      const filtered = resources.filter((entry) => {
        // Role-based visibility
        if (session.role === 'student' && entry.status !== 'live') {
          return false
        }

        // Search term matching
        if (!matchesSearchTerm(q, entry.title, entry.subject, entry.class, entry.summary)) {
          return false
        }

        // Class filter
        if (resourceClass && entry.class !== resourceClass) {
          return false
        }

        // Subject filter
        if (resourceSubject && entry.subject !== resourceSubject) {
          return false
        }

        return true
      })

      items.push(...filtered)
      suggestions.push(...extractSuggestions(filtered, q, 5))
    }

    if (['users', 'all'].includes(type)) {
      // Only admins can search users
      if (session.role === 'admin') {
        const users = await listUserRecords()
        const filtered = users.filter((entry) => {
          // Search term matching
          if (!matchesSearchTerm(q, entry.displayName, entry.email, entry.loginId, entry.role)) {
            return false
          }

          // Role filter
          if (userRole && entry.role !== userRole) {
            return false
          }

          // Status filter
          if (userStatus && entry.status !== userStatus) {
            return false
          }

          return true
        })

        items.push(...filtered)
        suggestions.push(...extractSuggestions(filtered, q, 5))
      }
    }

    const sorted = sortResults(items, sortBy)
    const { entries, pagination } = paginateResults(sorted, page, limit)

    await logAction({
      user: session,
      action: 'SEARCH',
      description: `Performed search: q="${q}", type="${type}", results=${entries.length}`,
      module: 'Search',
      status: 'SUCCESS',
      request,
      metadata: {
        searchTerm: q,
        type,
        filters: { class: resourceClass, subject: resourceSubject, role: userRole, status: userStatus },
        resultCount: entries.length,
      },
    })

    await detectRapidRepeatedActions({
      user: session,
      actionKey: 'SEARCH',
      request,
      threshold: 18,
      windowSeconds: 30,
      description: 'Rapid repeated search requests detected.',
    }).catch(() => null)

    return withNoStore(
      NextResponse.json({
        results: entries,
        suggestions: Array.from(new Set(suggestions)).slice(0, 10),
        pagination,
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request).catch(() => null),
      action: 'SEARCH',
      description: 'Search request failed.',
      module: 'Search',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not perform search.')
  }
}
