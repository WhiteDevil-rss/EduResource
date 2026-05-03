export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireRole } from '@/lib/auth-server'

export default async function AdminLayout({ children }) {
  await requireRole(['admin'], '/admin/dashboard')
  return children
}
