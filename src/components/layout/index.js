/**
 * Layout Components - Mobile-first responsive UI system
 * 
 * All components follow these principles:
 * - Mobile-first design (flex-col, full-width)
 * - Responsive breakpoints (md:, lg:)
 * - Consistent spacing (gap-4, gap-6)
 * - Accessibility built-in (ARIA, keyboard navigation)
 */

export { AppLayout } from './AppLayout'
export { ResponsiveSidebar } from './ResponsiveSidebar'
export { ResponsiveSidebar as Sidebar } from './ResponsiveSidebar'
export { ResponsiveTopbar } from './ResponsiveTopbar'
export { ResponsiveTopbar as Topbar } from './ResponsiveTopbar'
export { ResponsiveFilterBar, FilterChip, ActiveFiltersDisplay } from './ResponsiveFilterBar'
export { ResponsiveFilterBar as FilterBar } from './ResponsiveFilterBar'
export { ResponsiveNotificationPanel, NotificationItem, EmptyNotifications } from './ResponsiveNotificationPanel'
export {
  StandardCard,
  StandardCard as Card,
  UserCard,
  ResourceCard,
  LogCard,
  StatCard,
} from './StandardCards'
export {
  PageContainer,
  ContentSection,
  SectionDivider,
  GridContainer,
  FlexContainer,
  ScrollableContainer,
  CompactSection,
  MetricGrid,
  StackedList,
} from './PageContainers'
