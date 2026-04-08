'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PageContainer,
  ContentSection,
  GridContainer,
  ResponsiveFilterBar,
} from '@/components/layout'
import { ResourceCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { BookOpen, Database } from 'lucide-react'

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
        if (!response.ok) throw new Error(payload?.error || 'Could not load resources.')
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
    return () => { mounted = false }
  }, [])

  const classOptions = useMemo(() => [
    { label: 'All Classes', value: 'all' },
    ...Array.from(new Set(resources.map((r) => r.class).filter(Boolean)))
      .sort()
      .map(c => ({ label: `Class ${c}`, value: c.toLowerCase() }))
  ], [resources])

  const subjectOptions = useMemo(() => [
    { label: 'All Subjects', value: 'all' },
    ...Array.from(new Set(resources.map((r) => r.subject).filter(Boolean)))
      .sort()
      .map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s.toLowerCase() }))
  ], [resources])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return resources.filter((entry) => {
      if (classFilter !== 'all' && String(entry.class || '').toLowerCase() !== classFilter) return false
      if (subjectFilter !== 'all' && String(entry.subject || '').toLowerCase() !== subjectFilter) return false
      if (!term) return true
      return [entry.title, entry.summary, entry.subject, entry.class]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [classFilter, resources, search, subjectFilter])

  const filterConfig = useMemo(() => [
    {
      id: 'search',
      type: 'search',
      label: 'Search Registry',
      placeholder: 'Search by title, subject, or summary...',
      value: search,
    },
    {
      id: 'class',
      type: 'select',
      label: 'Grade Level',
      value: classFilter,
      options: classOptions,
    },
    {
      id: 'subject',
      type: 'select',
      label: 'Subject Domain',
      value: subjectFilter,
      options: subjectOptions,
    },
  ], [search, classFilter, classOptions, subjectFilter, subjectOptions])

  const handleFilterChange = (id, value) => {
    if (id === 'search') setSearch(value)
    if (id === 'class') setClassFilter(value)
    if (id === 'subject') setSubjectFilter(value)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="Resource Library"
        subtitle="Manage and oversee academic materials across the platform"
        noPaddingBottom
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
              <Database size={14} />
              Resources Indexed: {resources.length}
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-muted/5 border border-border/10">
            <ResponsiveFilterBar
              filters={filterConfig}
              onFilterChange={handleFilterChange}
              onReset={() => { setSearch(''); setClassFilter('all'); setSubjectFilter('all'); }}
            />
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SkeletonWrapper name="admin-resources-list" loading={loading}>
          {filtered.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
                <BookOpen size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No resources found</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  No materials match your current filter settings. Try clearing filters to see all entries.
                </p>
              </div>
              <button
                onClick={() => { setSearch(''); setClassFilter('all'); setSubjectFilter('all'); }}
                className="h-9 px-6 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-sm shadow-primary/20 mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <GridContainer columns={3}>
              {filtered.map((entry) => (
                <ResourceCard
                  key={entry.id}
                  resource={entry}
                  isAdmin
                  onDelete={() => console.log('Delete logic preserved')}
                  onEdit={() => console.log('Edit logic preserved')}
                />
              ))}
            </GridContainer>
          )}
        </SkeletonWrapper>
      </PageContainer>
    </div>
  )
}
