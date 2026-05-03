export const THEME_STORAGE_KEY = 'eduresourcehub-theme'
export const ACCENT_STORAGE_KEY = 'eduresourcehub-accent'
export const DEFAULT_ACCENT = 'indigo'
export const AVAILABLE_ACCENTS = ['indigo', 'teal', 'violet']
export const THEME_EVENT = 'eduresourcehub-theme-change'
export const ACCENT_EVENT = 'eduresourcehub-accent-change'

export function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(value) {
  return value === 'light' || value === 'dark' ? value : getSystemTheme()
}

export function resolveAccent(value) {
  return AVAILABLE_ACCENTS.includes(value) ? value : DEFAULT_ACCENT
}

export function applyTheme(theme, accent = DEFAULT_ACCENT) {
  if (typeof document === 'undefined') {
    return
  }

  const resolvedTheme = resolveTheme(theme)
  const resolvedAccent = resolveAccent(accent)

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolvedTheme)
  document.documentElement.setAttribute('data-theme', resolvedTheme)
  document.documentElement.setAttribute('data-accent', resolvedAccent)
  document.documentElement.style.colorScheme = resolvedTheme
}

export function persistTheme(theme) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  window.dispatchEvent(new window.CustomEvent(THEME_EVENT, { detail: theme }))
}

export function persistAccent(accent) {
  if (typeof window === 'undefined') {
    return
  }

  const resolvedAccent = resolveAccent(accent)
  window.localStorage.setItem(ACCENT_STORAGE_KEY, resolvedAccent)
  window.dispatchEvent(new window.CustomEvent(ACCENT_EVENT, { detail: resolvedAccent }))
}

export function readStoredTheme() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY)
}

export function readStoredAccent() {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT
  }

  return resolveAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY))
}
