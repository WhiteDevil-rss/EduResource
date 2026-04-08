'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'
import { EmptyState, FilterBar, FilterLabel } from '@/components/ui/layout'

export default function AdminResourcesPage() {
  const [loading, setLoading] = useState(true)
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await fetch('/api/admin/overview', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load resources.')
        }
        if (!mounted) return
        setResources(Array.isArray(payload?.resources) ? payload.resources : [])
      } catch {
        if (!mounted) return
        setResources([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const classOptions = useMemo(() => ['all', ...Array.from(new Set(resources.map((entry) => entry.class).filter(Boolean)))], [resources])
  const subjectOptions = useMemo(() => ['all', ...Array.from(new Set(resources.map((entry) => entry.subject).filter(Boolean)))], [resources])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return resources.filter((entry) => {
      if (classFilter !== 'all' && String(entry.class || '').toLowerCase() !== classFilter.toLowerCase()) {
        return false
      }
      if (subjectFilter !== 'all' && String(entry.subject || '').toLowerCase() !== subjectFilter.toLowerCase()) {
        return false
      }
      if (!term) return true
      return [entry.title, entry.summary, entry.subject, entry.class]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [classFilter, resources, search, subjectFilter])

  return (
    <AdminPageWrapper
      title="Resources & Publications"
      description="Audit content quality, metadata consistency, and publication status."
      filters={
        <FilterBar>
          <FilterLabel label="Search">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" className="w-full sm:w-72" />
          </FilterLabel>
          <FilterLabel label="Class">
            <select className="ui-input w-full sm:w-44" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All Classes' : option}</option>
              ))}
            </select>
          </FilterLabel>
          <FilterLabel label="Subject">
            <select className="ui-input w-full sm:w-44" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              {subjectOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All Subjects' : option}</option>
              ))}
            </select>
          </FilterLabel>
          <Badge variant="outline" className="ml-auto">{filtered.length} result(s)</Badge>
        </FilterBar>
      }
    >
      <SkeletonWrapper name="admin-resources-list" loading={loading}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <EmptyState
              title="No resources found"
              description="Try changing the search term or category filters."
            />
          ) : null}
          {filtered.map((entry) => (
            <SectionCard key={entry.id}>
              <CardHeader className="p-4 pb-0 md:p-5 md:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{entry.subject || 'General'}</Badge>
                    <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                  </div>
                  <Badge variant={entry.status === 'live' ? 'secondary' : 'outline'}>{entry.status || 'unknown'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 md:p-5">
                <CardTitle className="text-lg">{entry.title || 'Untitled resource'}</CardTitle>
                <p className="text-sm text-muted-foreground">{entry.summary || 'No summary available.'}</p>
                <p className="text-xs text-muted-foreground">Created: {formatDisplayDate(entry.createdAt, 'N/A')}</p>
              </CardContent>
            </SectionCard>
          ))}
        </div>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
