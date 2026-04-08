import { describe, expect, it } from 'vitest'
import { resolveSidebarKeyboardAction } from '@/components/admin/sidebarKeyboard'

describe('resolveSidebarKeyboardAction', () => {
  it('moves focus with ArrowUp and ArrowDown', () => {
    expect(
      resolveSidebarKeyboardAction({
        key: 'ArrowDown',
        currentIndex: 1,
        totalItems: 5,
        isGroupToggle: false,
        groupLabel: null,
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'focus-index', index: 2 })

    expect(
      resolveSidebarKeyboardAction({
        key: 'ArrowUp',
        currentIndex: 1,
        totalItems: 5,
        isGroupToggle: false,
        groupLabel: null,
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'focus-index', index: 0 })
  })

  it('jumps to start/end with Home and End', () => {
    expect(
      resolveSidebarKeyboardAction({
        key: 'Home',
        currentIndex: 3,
        totalItems: 6,
        isGroupToggle: false,
        groupLabel: null,
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'focus-index', index: 0 })

    expect(
      resolveSidebarKeyboardAction({
        key: 'End',
        currentIndex: 0,
        totalItems: 6,
        isGroupToggle: false,
        groupLabel: null,
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'focus-index', index: 5 })
  })

  it('collapses and expands groups with ArrowLeft and ArrowRight', () => {
    expect(
      resolveSidebarKeyboardAction({
        key: 'ArrowLeft',
        currentIndex: 0,
        totalItems: 4,
        isGroupToggle: true,
        groupLabel: 'Security',
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'toggle-group', groupLabel: 'Security' })

    expect(
      resolveSidebarKeyboardAction({
        key: 'ArrowRight',
        currentIndex: 0,
        totalItems: 4,
        isGroupToggle: true,
        groupLabel: 'Security',
        isGroupCollapsed: true,
      })
    ).toEqual({ type: 'toggle-group', groupLabel: 'Security' })
  })

  it('moves into group links with ArrowRight when group is expanded', () => {
    expect(
      resolveSidebarKeyboardAction({
        key: 'ArrowRight',
        currentIndex: 0,
        totalItems: 4,
        isGroupToggle: true,
        groupLabel: 'Security',
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'focus-first-group-link', groupLabel: 'Security' })
  })

  it('returns none for unsupported keys', () => {
    expect(
      resolveSidebarKeyboardAction({
        key: 'Enter',
        currentIndex: 0,
        totalItems: 3,
        isGroupToggle: false,
        groupLabel: null,
        isGroupCollapsed: false,
      })
    ).toEqual({ type: 'none' })
  })
})
