'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'

function requestStatusLabel(status) {
  if (status === 'underreview') return 'Under Review'
  if (status === 'done') return 'Done'
  return 'Pending'
}

export default function ResourceRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/resource-requests', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load resource requests.')
      }
      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
    } catch (error) {
      toast.error(error.message || 'Could not load resource requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false
      }

      if (!term) return true
      return [entry.titleName, entry.studentName, entry.studentEmail, entry.courseName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [requests, search, statusFilter])

  const changeStatus = async (entry, status) => {
    try {
      const response = await fetch(`/api/admin/resource-requests/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update request status.')
      }

      setRequests((current) => current.map((item) => (item.id === entry.id ? payload.request : item)))
      toast.success(`Request moved to ${requestStatusLabel(status).toLowerCase()}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update request status.')
    }
  }

  return (
    <AdminPageWrapper
      title="Resource Requests"
      description="Review incoming resource requests and update processing status."
      filters={
        <>
          <label className="student-filter-control student-filter-control--search">
            <span>Search</span>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" />
          </label>
          <label className="student-filter-control">
            <span>Status</span>
            <select className="ui-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="underreview">Under Review</option>
              <option value="done">Done</option>
            </select>
          </label>
          <Badge variant="outline" className="student-filter-count">{filtered.length} result(s)</Badge>
        </>
      }
    >
      <SkeletonWrapper name="admin-resource-requests-list" loading={loading}>
        <div className="student-resource-grid">
          {filtered.map((entry) => (
            <Card key={entry.id} className="student-resource-card">
              <CardHeader className="student-resource-card__header">
                <div className="student-resource-card__meta">
                  <Badge>{entry.courseName || 'No course'}</Badge>
                  <Badge variant="outline">{entry.preferredFormat || 'Any format'}</Badge>
                </div>
                <Badge variant={entry.status === 'done' ? 'secondary' : 'outline'}>{requestStatusLabel(entry.status)}</Badge>
              </CardHeader>
              <CardContent>
                <CardTitle className="student-resource-card__title">{entry.titleName || 'Untitled request'}</CardTitle>
                <p className="student-resource-card__summary">{entry.studentName || entry.studentEmail}</p>
                <p className="student-resource-card__updated">Submitted: {formatDisplayDate(entry.createdAt, 'N/A')}</p>
              </CardContent>
              <CardContent className="student-resource-card__actions">
                <label className="admin-request-status">
                  <span className="sr-only">Update request status</span>
                  <select
                    className="ui-input admin-request-status__select"
                    value={entry.status || 'pending'}
                    onChange={(event) => changeStatus(entry, event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
