'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { SecurityAdvancedSettings } from '@/components/SecurityAdvancedSettings'
import { PageContainer, ContentSection } from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { ShieldCheck } from 'lucide-react'

export default function AdvancedSecurityPage() {
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
              Security controls
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Configure advanced authentication and defense policies.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Fine-tune system hardening settings with a cleaner, role-aware control surface.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[260px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mode</p>
              <p className="mt-2 text-2xl font-semibold">Strict</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">MFA</p>
              <p className="mt-2 text-2xl font-semibold">Ready</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection 
        title="Security Settings" 
        subtitle="Manage global authentication standards, multi-factor security, and privileged access controls"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={12} />
            System Secure
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SecurityAdvancedSettings />
      </PageContainer>
    </div>
  )
}
