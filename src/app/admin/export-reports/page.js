'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { Download } from 'lucide-react'
import { PageContainer, ContentSection } from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { ExportReportsSection } from '@/components/ExportBackupSection'

export default function ExportReportsPage() {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Reporting pipeline
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Export operational data and audit-ready reports securely.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Generate structured exports for analytics, governance, and external review with a cleaner workflow.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[260px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Format</p>
              <p className="mt-2 text-2xl font-semibold">CSV</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Service</p>
              <p className="mt-2 text-2xl font-semibold">Ready</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection 
        title="Data Exports" 
        subtitle="Download platform reports, user registries, and activity snapshots"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <Download size={14} />
            Verified Export Service
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <div className="max-w-4xl">
          <ExportReportsSection />
        </div>
      </PageContainer>
    </div>
  )
}
