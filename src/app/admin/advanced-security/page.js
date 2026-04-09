'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { SecurityAdvancedSettings } from '@/components/SecurityAdvancedSettings'
import { PageContainer, ContentSection } from '@/components/layout'
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
      <ContentSection 
        title="Security Settings" 
        subtitle="Manage global authentication standards, multi-factor security, and access controls"
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
