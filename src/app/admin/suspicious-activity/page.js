'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { SuspiciousActivityPanel } from '@/components/SuspiciousActivityPanel'
import { PageContainer, ContentSection } from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { Activity } from 'lucide-react'

export default function SuspiciousActivityPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(user)) {
      router.replace('/login?reason=unauthorized')
      return
    }
    if (!isSuperAdmin(user)) {
      router.replace('/admin/dashboard')
    }
  }, [authLoading, user, router])

  return (
    <div className="space-y-8">
      <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Threat intelligence
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Monitor suspicious behavior and security anomalies in real time.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Investigate high-risk events quickly with a cleaner monitoring surface and improved visual hierarchy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[260px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Feed</p>
              <p className="mt-2 text-2xl font-semibold">Live</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Priority</p>
              <p className="mt-2 text-2xl font-semibold">High</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection 
        title="Security Monitoring" 
        subtitle="Track events, risk signals, and access anomalies across the platform"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <Activity size={12} />
            Live Monitoring
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SuspiciousActivityPanel />
      </PageContainer>
    </div>
  )
}
