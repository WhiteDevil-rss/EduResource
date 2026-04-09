import {
  Activity,
  BarChart3,
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
      { id: 'security-settings', label: 'Security Settings', href: '/admin/security-settings', icon: Shield, allowedScopes: ['super_admin'] },
      { id: 'advanced-security', label: 'Advanced Security Controls', href: '/admin/advanced-security', icon: Lock, allowedScopes: ['super_admin'] },
      { id: 'ip-management', label: 'IP Management', href: '/admin/ip-management', icon: ShieldAlert, allowedScopes: ['super_admin'] },
    ],
  },
  {
    label: 'User Management',
    items: [
      { id: 'user-management', label: 'User Management', href: '/admin/user-management', icon: Users, allowedScopes: ['admin', 'super_admin'] },
      { id: 'activity-timeline', label: 'Activity Timeline', href: '/admin/activity-timeline', icon: Activity, allowedScopes: ['super_admin'] },
    ],
  },
  {
    label: 'Resources',
    items: [
      { id: 'resources', label: 'Resources & Publications', href: '/admin/resources', icon: FileText, allowedScopes: ['admin', 'super_admin'] },
      { id: 'resource-requests', label: 'Resource Requests', href: '/admin/resource-requests', icon: Library, allowedScopes: ['admin', 'super_admin'] },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'analytics', label: 'Platform Analytics', href: '/admin/analytics', icon: BarChart3, allowedScopes: ['admin', 'super_admin'] },
    ],
  },
  {
    label: 'Governance',
    items: [
      { id: 'moderation', label: 'Content Moderation', href: '/admin/moderation', icon: Shield, allowedScopes: ['admin', 'super_admin'] },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'audit-logs', label: 'Audit Logs', href: '/admin/audit-logs', icon: FileBarChart2, allowedScopes: ['super_admin'] },
      { id: 'suspicious-activity', label: 'Suspicious Activity', href: '/admin/suspicious-activity', icon: Radar, allowedScopes: ['super_admin'] },
    ],
  },
  {
    label: 'System Tools',
    items: [
      { id: 'export-reports', label: 'Export Reports', href: '/admin/export-reports', icon: FileBarChart2, allowedScopes: ['super_admin'] },
      { id: 'backup-system', label: 'Backup System', href: '/admin/backup-system', icon: HardDrive, allowedScopes: ['super_admin'] },
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
