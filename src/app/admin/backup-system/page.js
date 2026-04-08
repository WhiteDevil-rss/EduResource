'use client'

import { BackupSystemSection } from '@/components/ExportBackupSection'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'

export default function BackupSystemPage() {
  return (
    <AdminPageWrapper
      title="Backup System"
      description="Run backups and review the most recent backup status."
    >
      <BackupSystemSection />
    </AdminPageWrapper>
  )
}
