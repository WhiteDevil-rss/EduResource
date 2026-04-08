import { Database } from 'lucide-react'
import { PageContainer, ContentSection } from '@/components/layout'
import { BackupSystemSection } from '@/components/ExportBackupSection'

export default function BackupSystemPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection 
        title="System Backups" 
        subtitle="Manage system data snapshots and monitor platform redundancy"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider">
            <Database size={14} />
            Status: Protected
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <BackupSystemSection />
      </PageContainer>
    </div>
  )
}
