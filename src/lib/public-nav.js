export function getPublicHeaderContent(pathname = '/') {
  const currentPath = String(pathname || '/')

  return {
    links: [
      { label: 'Home', href: '/', current: currentPath === '/' },
      { label: 'Features', href: '/#features' },
      { label: 'Team', href: '/#team' },
    ],
    actions: [
      { label: 'Sign In', href: '/login', variant: 'ghost', current: currentPath === '/login' },
      { label: 'Sign Up', href: '/register', variant: 'primary', current: currentPath === '/register' },
    ],
  }
}