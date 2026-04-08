'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'
import { EmptyState, FilterBar, FilterLabel } from '@/components/ui/layout'

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
        <FilterBar>
          <FilterLabel label="Search">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" className="w-full sm:w-72" />
          </FilterLabel>
          <FilterLabel label="Status">
            <select className="ui-input w-full sm:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="underreview">Under Review</option>
              <option value="done">Done</option>
            </select>
          </FilterLabel>
          <Badge variant="outline" className="ml-auto">{filtered.length} result(s)</Badge>
        </FilterBar>
      }
    >
      <SkeletonWrapper name="admin-resource-requests-list" loading={loading}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <EmptyState
              title="No requests found"
              description="Try changing the search term or status filter."
            />
          ) : null}
          {filtered.map((entry) => (
            <SectionCard key={entry.id}>
              <CardHeader className="p-4 pb-0 md:p-5 md:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{entry.courseName || 'No course'}</Badge>
                    <Badge variant="outline">{entry.preferredFormat || 'Any format'}</Badge>
                  </div>
                  <Badge variant={entry.status === 'done' ? 'secondary' : 'outline'}>{requestStatusLabel(entry.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 md:p-5">
                <CardTitle className="text-lg">{entry.titleName || 'Untitled request'}</CardTitle>
                <p className="text-sm text-muted-foreground">{entry.studentName || entry.studentEmail}</p>
                <p className="text-xs text-muted-foreground">Submitted: {formatDisplayDate(entry.createdAt, 'N/A')}</p>
                <label className="admin-request-status">
                  <span className="sr-only">Update request status</span>
                  <select
                    className="ui-input w-full sm:w-52"
                    value={entry.status || 'pending'}
                    onChange={(event) => changeStatus(entry, event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              </CardContent>
            </SectionCard>
          ))}
        </div>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
