'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Download, RefreshCcw, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function severityTone(severity) {
  const normalized = String(severity || '').toUpperCase()
  if (normalized === 'HIGH') return 'suspicious-severity suspicious-severity--high'
  if (normalized === 'MEDIUM') return 'suspicious-severity suspicious-severity--medium'
  return 'suspicious-severity suspicious-severity--low'
}

function formatTime(value) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

function userLabel(entry) {
  const name = String(entry?.userName || '').trim()
  const email = String(entry?.userEmail || '').trim()
  return {
    title: name || 'Unknown user',
    subtitle: email || 'unknown',
  }
}

export function SuspiciousActivityPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    user: '',
    from: '',
    to: '',
  })

  const loadActivities = useCallback(async (nextPage = pagination.page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pagination.limit),
      })

      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.user.trim()) params.set('user', filters.user.trim())
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const response = await fetch(`/api/admin/suspicious-activities?${params.toString()}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load suspicious activity logs.')
      }

      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
      setPagination(payload?.pagination || { page: 1, limit: 20, total: 0, pages: 1 })
    } catch (error) {
      toast.error(error.message || 'Could not load suspicious activity logs.')
      setActivities([])
      setPagination({ page: 1, limit: 20, total: 0, pages: 1 })
    } finally {
      setLoading(false)
    }
  }, [filters.from, filters.search, filters.severity, filters.to, filters.user, pagination.limit, pagination.page])

  useEffect(() => {
    loadActivities(1)
  }, [loadActivities])

  const highCount = useMemo(
    () => activities.filter((entry) => String(entry?.severity || '').toUpperCase() === 'HIGH').length,
    [activities]
  )

  const markReviewed = async (activityId) => {
    if (!activityId || saving) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/suspicious-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not mark this activity as reviewed.')
      }

      setActivities((current) =>
        current.map((entry) =>
          entry.id === activityId
            ? { ...entry, reviewed: true, reviewedAt: new Date().toISOString() }
            : entry
        )
      )
      toast.success('Activity marked as reviewed.')
    } catch (error) {
      toast.error(error.message || 'Could not mark this activity as reviewed.')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = async () => {
    if (exportingCsv) {
      return
    }

    setExportingCsv(true)
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.user.trim()) params.set('user', filters.user.trim())
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const response = await fetch(`/api/admin/suspicious-activities?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Could not export suspicious activity logs.')
      }

      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `suspicious-activities-${new Date().toISOString().split('T')[0]}.csv`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(anchor)
      toast.success('Suspicious activity CSV downloaded.')
    } catch (error) {
      toast.error(error.message || 'Could not export suspicious activity logs.')
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="suspicious-title">
          <ShieldAlert size={18} />
          Suspicious Activity
        </CardTitle>
        <CardDescription>
          Security events across login behavior, unusual device/location access, spam-like actions, and unauthorized attempts.
        </CardDescription>
      </CardHeader>
      <CardContent className="suspicious-body">
        <div className="suspicious-controls">
          <Input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search action, IP, device, location"
            aria-label="Search suspicious events"
          />
          <Input
            value={filters.user}
            onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))}
            placeholder="Filter by user/email"
            aria-label="Filter by user"
          />
          <select
            className="ui-input"
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}
            aria-label="Filter by severity"
          >
            <option value="">All Severities</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            aria-label="From date"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            aria-label="To date"
          />
          <Button type="button" variant="outline" onClick={() => loadActivities(1)}>
            <RefreshCcw size={14} />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={exportingCsv}>
            <Download size={14} />
            {exportingCsv ? 'Exporting CSV...' : 'Export CSV'}
          </Button>
        </div>

        <div className="suspicious-summary">
          <Badge variant="outline">{pagination.total} total events</Badge>
          <Badge className="suspicious-severity suspicious-severity--high">{highCount} high severity</Badge>
        </div>

        <div className="suspicious-table-wrap">
          <table className="suspicious-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Severity</th>
                <th>IP Address</th>
                <th>Location</th>
                <th>Device</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Loading suspicious activity logs...</td>
                </tr>
              ) : null}

              {!loading && activities.length === 0 ? (
                <tr>
                  <td colSpan={8}>No suspicious activity found for current filters.</td>
                </tr>
              ) : null}

              {!loading
                ? activities.map((entry) => {
                    const user = userLabel(entry)
                    const location = `${entry?.location?.city || 'Unknown'}, ${entry?.location?.country || 'Unknown'}`
                    const deviceText = `${entry?.device?.browser || 'Unknown'} / ${entry?.device?.os || 'Unknown'} / ${entry?.device?.deviceType || 'desktop'}`
                    const isHigh = String(entry?.severity || '').toUpperCase() === 'HIGH'

                    return (
                      <tr key={entry.id} className={isHigh ? 'suspicious-row--high' : ''}>
                        <td>
                          <strong>{user.title}</strong>
                          <p>{user.subtitle}</p>
                        </td>
                        <td>
                          <strong>{entry.action}</strong>
                          <p>{entry.description}</p>
                        </td>
                        <td>
                          <span className={severityTone(entry.severity)}>{entry.severity}</span>
                        </td>
                        <td>{entry.ipAddress || 'unknown'}</td>
                        <td>{location}</td>
                        <td title={deviceText}>{deviceText}</td>
                        <td>{formatTime(entry.timestamp)}</td>
                        <td>
                          {entry.reviewed ? (
                            <Badge variant="outline">Reviewed</Badge>
                          ) : (
                            <Button type="button" size="sm" variant="outline" onClick={() => markReviewed(entry.id)} disabled={saving}>
                              Review
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>

        <div className="suspicious-pagination">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadActivities(Math.max(1, pagination.page - 1))}
            disabled={loading || pagination.page <= 1}
          >
            Previous
          </Button>
          <Badge variant="outline">
            Page {pagination.page} of {pagination.pages}
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => loadActivities(Math.min(pagination.pages, pagination.page + 1))}
            disabled={loading || pagination.page >= pagination.pages}
          >
            Next
          </Button>
        </div>

        {highCount > 0 ? (
          <div className="student-inline-message student-inline-message--error">
            <AlertTriangle size={16} />
            <span>High-severity alerts detected. Prioritize immediate review.</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
