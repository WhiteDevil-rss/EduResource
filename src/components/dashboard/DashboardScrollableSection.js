'use client'

import { cn } from '@/lib/cn'

export function DashboardScrollableSection({
  id,
  ariaLabel,
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}) {
  return (
    <section id={id} className={cn('dashboard-scroll-section', className)} aria-label={ariaLabel}>
      <div className="dashboard-scroll-section__scroll custom-scrollbar">
        <div className="dashboard-scroll-section__header">
          <div className="student-section__heading dashboard-scroll-section__heading">
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {actions ? <div className="dashboard-scroll-section__actions">{actions}</div> : null}
        </div>
        <div className={cn('dashboard-scroll-section__body', bodyClassName)}>{children}</div>
      </div>
    </section>
  )
}
