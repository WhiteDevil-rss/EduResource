import { requireRole } from '@/lib/auth-server'

export default async function AdminLayout({ children }) {
  await requireRole(['admin'], '/dashboard/admin')
  return children
}
