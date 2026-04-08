'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { SecurityBlockManagement } from '@/components/SecurityBlockManagement'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'

export default function IpManagementPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/users?page=1&limit=500', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load users for IP management.')
      }
      setUsers(Array.isArray(payload?.users) ? payload.users : [])
    } catch (loadError) {
      setError(loadError.message || 'Could not load users for IP management.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <AdminPageWrapper
      title="IP Management"
      description="Block malicious IPs, manage user blocks, and monitor protection controls."
    >
      <SkeletonWrapper name="admin-ip-management" loading={loading}>
        {error ? (
          <div className="student-inline-message student-inline-message--error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}
        <SecurityBlockManagement users={users} onChanged={loadUsers} />
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
