'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { CardContent } from '@/components/ui/card'

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/analytics/summary', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load analytics.')
        }

        if (!isActive) {
          return
        }

        setSummary(payload?.summary || null)
        setError('')
      } catch (loadError) {
        if (!isActive) {
          return
        }
        setError(loadError.message || 'Could not load analytics.')
        setSummary(null)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <AdminPageWrapper
      title="Platform Analytics"
      description="Track users, resources, reviews, and collections across the super-admin scope."
    >
      <SkeletonWrapper name="admin-analytics" loading={loading}>
        <SectionCard>
          {error ? (
            <div className="student-inline-message student-inline-message--error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}
          {summary ? (
            <div className="p-4">
              <AnalyticsDashboard summary={summary} role="admin" />
            </div>
          ) : (
            <CardContent>No analytics data yet.</CardContent>
          )}
        </SectionCard>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
