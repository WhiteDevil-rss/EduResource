import { describe, expect, it, vi } from 'vitest'

const redirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect,
}))

describe('AdminIndexPage', () => {
  it('redirects to the admin dashboard', async () => {
    const mod = await import('@/app/admin/page')
    mod.default()
    expect(redirect).toHaveBeenCalledWith('/admin/dashboard')
  })
})
