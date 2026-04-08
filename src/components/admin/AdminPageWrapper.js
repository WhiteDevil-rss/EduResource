'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ADMIN_NAV_ITEM_MAP } from '@/components/admin/adminNav'

function buildBreadcrumbs(pathname) {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean)

  if (segments.length === 0 || segments[0] !== 'admin') {
    return []
  }

  const breadcrumbs = [{ href: '/admin/security-settings', label: 'Admin' }]
  if (segments.length === 1) {
    return breadcrumbs
  }

  const fullPath = `/${segments.join('/')}`
  const currentLabel = ADMIN_NAV_ITEM_MAP[fullPath] || segments[segments.length - 1].replace(/-/g, ' ')
  breadcrumbs.push({ href: fullPath, label: currentLabel })
  return breadcrumbs
}

export function AdminPageWrapper({ title, description, filters, children, actions }) {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)

  return (
    <section className="admin-v2-page">
      {breadcrumbs.length > 0 ? (
        <nav className="admin-v2-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="admin-v2-breadcrumbs__item">
              {index < breadcrumbs.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              {index < breadcrumbs.length - 1 ? <span className="admin-v2-breadcrumbs__sep">/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}

      <header className="admin-v2-page__header glass-panel">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="admin-v2-page__actions">{actions}</div> : null}
      </header>

      {filters ? <div className="admin-v2-page__filters glass-panel">{filters}</div> : null}

      <div className="admin-v2-page__scroll custom-scrollbar">{children}</div>
    </section>
  )
}

export function SectionCard({ title, description, children, actions }) {
  return (
    <Card className="admin-v2-card">
      {(title || description || actions) ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {actions ? <div className="admin-v2-card__actions">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  )
}
