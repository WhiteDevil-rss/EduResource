import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { Download } from 'lucide-react'
import { PageContainer, ContentSection } from '@/components/layout'
import { ExportReportsSection } from '@/components/ExportBackupSection'

export default function ExportReportsPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()

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
  }, [authLoading, user, role, router])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection 
        title="Data Exports" 
        subtitle="Download platform reports, user registries, and activity logs for analysis"
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
        <div className="max-w-3xl">
          <ExportReportsSection />
        </div>
      </PageContainer>
    </div>
  )
}
