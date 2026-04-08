'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilterBar, FilterLabel, PaginationControls, EmptyState } from '@/components/ui/layout'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'
import { SectionCard as AdminSectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatISTCompact } from '@/lib/date-utils'

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
        <FilterBar onReset={() => { setFilters(INITIAL_FILTERS); load(1, INITIAL_FILTERS); }}>
          <FilterLabel label="Search">
            <Input 
              value={filters.search} 
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} 
              placeholder="User, action, module..." 
              className="w-full sm:w-48"
            />
          </FilterLabel>
          <FilterLabel label="Action">
            <Input 
              value={filters.action} 
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} 
              placeholder="e.g. LOGIN" 
              className="w-full sm:w-40"
            />
          </FilterLabel>
          <FilterLabel label="Status">
            <select 
              className="ui-input px-3 py-2 rounded-lg text-sm bg-surface-card border border-outline hover:border-outline-strong hover:bg-surface-card-high transition-colors w-full sm:w-32" 
              value={filters.status} 
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </FilterLabel>
          <FilterLabel label="From">
            <Input 
              type="date" 
              value={filters.fromDate} 
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} 
              className="w-full sm:w-40"
            />
          </FilterLabel>
          <FilterLabel label="To">
            <Input 
              type="date" 
              value={filters.toDate} 
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} 
              className="w-full sm:w-40"
            />
          </FilterLabel>
          <div className="sm:ml-auto">
            <Button type="button" variant="default" onClick={() => load(1, filters)} className="w-full sm:w-auto">
              Apply Filters
            </Button>
          </div>
        </FilterBar>
      }
    >
      <SkeletonWrapper name="admin-audit-logs-list" loading={loading}>
        <AdminSectionCard>
          {error ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger" role="alert">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : null}

          {logs.length === 0 && !error ? (
            <EmptyState
              title="No audit logs found"
              description="No logs match your current filters. Try removing some filters to see more results."
              icon={AlertCircle}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-surface-card-high transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <strong className="text-foreground">{entry.userName || entry.userEmail || 'Unknown user'}</strong>
                            {entry.userEmail && entry.userEmail !== entry.userName && (
                              <p className="text-xs text-muted">{entry.userEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <strong className="text-foreground">{entry.action}</strong>
                            <p className="text-xs text-muted line-clamp-1">{entry.description || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{entry.module || 'General'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'FAILED' ? 'outline' : 'secondary'} className="text-xs">
                            {entry.status || 'SUCCESS'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted whitespace-nowrap" title={formatISTCompact(entry.timestamp || entry.createdAt, 'N/A')}>
                            {formatISTCompact(entry.timestamp || entry.createdAt, 'N/A')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                loading={loading}
                onPrevious={() => load(Math.max(1, pagination.page - 1), filters)}
                onNext={() => load(Math.min(pagination.pages, pagination.page + 1), filters)}
                className="mt-4"
              />
            </>
          )}
        </AdminSectionCard>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
