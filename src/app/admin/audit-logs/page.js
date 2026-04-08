'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'

const INITIAL_FILTERS = { search: '', action: '', status: '', fromDate: '', toDate: '' }

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const load = useCallback(async (page = 1, nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search: nextFilters.search,
        action: nextFilters.action,
        status: nextFilters.status,
        fromDate: nextFilters.fromDate,
        toDate: nextFilters.toDate,
      })

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load audit logs.')
      }

      setLogs(Array.isArray(payload?.logs) ? payload.logs : [])
      setPagination(payload?.pagination || { page: 1, pages: 1, total: 0 })
    } catch (loadError) {
      setError(loadError.message || 'Could not load audit logs.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(1, INITIAL_FILTERS)
  }, [load])

  return (
    <AdminPageWrapper
      title="Audit Logs"
      description="Inspect who did what, where, and when with protected super-admin visibility."
      filters={
        <>
          <label className="student-filter-control student-filter-control--search">
            <span>Search</span>
            <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search user, action, module" />
          </label>
          <label className="student-filter-control">
            <span>Action</span>
            <Input value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} placeholder="e.g. LOGIN" />
          </label>
          <label className="student-filter-control">
            <span>Status</span>
            <select className="ui-input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
          <label className="student-filter-control">
            <span>From</span>
            <Input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} />
          </label>
          <label className="student-filter-control">
            <span>To</span>
            <Input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} />
          </label>
          <div className="student-filter-actions">
            <Button type="button" variant="default" onClick={() => load(1, filters)}>Apply</Button>
          </div>
        </>
      }
    >
      <SkeletonWrapper name="admin-audit-logs-list" loading={loading}>
        <SectionCard>
          {error ? (
            <div className="student-inline-message student-inline-message--error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No audit logs found for current filters.</TableCell>
                </TableRow>
              ) : null}
              {logs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <strong>{entry.userName || entry.userEmail || 'Unknown user'}</strong>
                    <p className="student-muted-text">{entry.userEmail || 'No email'}</p>
                  </TableCell>
                  <TableCell>
                    <strong>{entry.action}</strong>
                    <p className="student-muted-text">{entry.description || '-'}</p>
                  </TableCell>
                  <TableCell>{entry.module || 'General'}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'FAILED' ? 'outline' : 'secondary'}>
                      {entry.status || 'SUCCESS'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDisplayDate(entry.timestamp || entry.createdAt, 'N/A')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="student-filter-actions admin-stack-gap-top">
            <Button type="button" variant="outline" disabled={pagination.page <= 1 || loading} onClick={() => load(Math.max(1, pagination.page - 1), filters)}>
              Previous
            </Button>
            <Badge variant="outline">
              Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
            </Badge>
            <Button type="button" variant="outline" disabled={pagination.page >= pagination.pages || loading} onClick={() => load(Math.min(pagination.pages, pagination.page + 1), filters)}>
              Next
            </Button>
          </div>
        </SectionCard>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
