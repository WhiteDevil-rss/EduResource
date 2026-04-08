'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'

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
        <>
          <label className="student-filter-control student-filter-control--search">
            <span>Search</span>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" />
          </label>
          <label className="student-filter-control">
            <span>Class</span>
            <select className="ui-input" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All Classes' : option}</option>
              ))}
            </select>
          </label>
          <label className="student-filter-control">
            <span>Subject</span>
            <select className="ui-input" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              {subjectOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All Subjects' : option}</option>
              ))}
            </select>
          </label>
          <Badge variant="outline" className="student-filter-count">{filtered.length} result(s)</Badge>
        </>
      }
    >
      <SkeletonWrapper name="admin-resources-list" loading={loading}>
        <div className="student-resource-grid">
          {filtered.map((entry) => (
            <Card key={entry.id} className="student-resource-card">
              <CardHeader className="student-resource-card__header">
                <div className="student-resource-card__meta">
                  <Badge>{entry.subject || 'General'}</Badge>
                  <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                </div>
                <Badge variant={entry.status === 'live' ? 'secondary' : 'outline'}>{entry.status || 'unknown'}</Badge>
              </CardHeader>
              <CardContent>
                <CardTitle className="student-resource-card__title">{entry.title || 'Untitled resource'}</CardTitle>
                <p className="student-resource-card__summary">{entry.summary || 'No summary available.'}</p>
                <p className="student-resource-card__updated">Created: {formatDisplayDate(entry.createdAt, 'N/A')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
