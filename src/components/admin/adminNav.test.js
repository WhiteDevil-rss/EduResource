import { describe, expect, it } from 'vitest'
import { ADMIN_NAV_ITEM_MAP, ADMIN_NAV_SECTIONS } from '@/components/admin/adminNav'

describe('admin navigation config', () => {
  it('contains unique admin routes and labels', () => {
    const hrefs = ADMIN_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href))
    const unique = new Set(hrefs)

    expect(unique.size).toBe(hrefs.length)
    for (const href of hrefs) {
      expect(href.startsWith('/admin/')).toBe(true)
      expect(ADMIN_NAV_ITEM_MAP[href]).toBeTruthy()
    }
  })
})
