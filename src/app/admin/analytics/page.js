'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PageContainer,
  ContentSection,
} from '@/components/layout'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { BarChart3, RefreshCcw, Activity } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser } from '@/lib/admin-protection'

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(user)) {
      router.replace('/login?reason=unauthorized')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user || !isAdminUser(user)) return
    let isActive = true
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/analytics/summary', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Could not load analytics.')
        if (!isActive) return
        setSummary(payload?.summary || null)
        setError('')
      } catch (loadError) {
        if (!isActive) return
        setError(loadError.message || 'Analytics sync error')
        setSummary(null)
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false }
  }, [authLoading, user])

  return (
    <div className="space-y-6">
      <ContentSection
        title="Platform Analytics"
        subtitle="Global insights and platform engagement metrics"
        noPaddingBottom
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                <BarChart3 size={14} />
                Live Feed: Active
             </div>
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <Activity size={14} />
                Last Sync: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             </div>
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SkeletonWrapper name="admin-analytics" loading={loading}>
          {error ? (
            <div className="max-w-2xl mx-auto py-24 rounded-xl border border-dashed border-destructive/20 bg-destructive/5 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Analytics unavailable</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We encountered an error while trying to load the platform metrics: {error}.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="h-10 px-6 bg-destructive text-white font-semibold text-xs rounded-lg hover:bg-destructive/90 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={14} />
                Retry Sync
              </button>
            </div>
          ) : summary ? (
            <AnalyticsDashboard summary={summary} role="admin" />
          ) : (
            <div className="py-32 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/20 border border-border/40 flex items-center justify-center text-muted-foreground/30 mx-auto animate-pulse">
                <RefreshCcw size={32} />
              </div>
              <p className="text-xs font-medium text-muted-foreground italic">
                Gathering platform data...
              </p>
            </div>
          )}
        </SkeletonWrapper>
      </PageContainer>
    </div>
  )
}
