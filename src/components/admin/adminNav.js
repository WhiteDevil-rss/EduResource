import {
  Activity,
  FileBarChart2,
  FileText,
  HardDrive,
  Library,
  Lock,
  Radar,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react'

export const ADMIN_NAV_SECTIONS = [
  {
    label: 'Security',
    items: [
      { label: 'Security Settings', href: '/admin/security-settings', icon: Shield },
      { label: 'Advanced Security Controls', href: '/admin/advanced-security', icon: Lock },
      { label: 'IP Management', href: '/admin/ip-management', icon: ShieldAlert },
    ],
  },
  {
    label: 'User Management',
    items: [
      { label: 'User Management', href: '/admin/user-management', icon: Users },
      { label: 'Activity Timeline', href: '/admin/activity-timeline', icon: Activity },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Resources & Publications', href: '/admin/resources', icon: FileText },
      { label: 'Resource Requests', href: '/admin/resource-requests', icon: Library },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileBarChart2 },
      { label: 'Suspicious Activity', href: '/admin/suspicious-activity', icon: Radar },
    ],
  },
  {
    label: 'System Tools',
    items: [
      { label: 'Export Reports', href: '/admin/export-reports', icon: FileBarChart2 },
      { label: 'Backup System', href: '/admin/backup-system', icon: HardDrive },
    ],
  },
]

export const ADMIN_NAV_ITEM_MAP = ADMIN_NAV_SECTIONS.flatMap((section) => section.items).reduce(
  (acc, item) => {
    acc[item.href] = item.label
    return acc
  },
  {}
)
