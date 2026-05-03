export function getPublicHeaderContent(pathname = '/') {
  const currentPath = String(pathname || '/')
  const isHomePage = currentPath === '/'

  return {
    links: [
      { label: 'Home', href: isHomePage ? '#hero' : '/', current: !isHomePage && currentPath === '/' },
      { label: 'Features', href: isHomePage ? '#features' : '/#features' },
      { label: 'Team', href: isHomePage ? '#team' : '/#team' },
    ],
    actions: [
      { label: 'Sign In', href: '/login', variant: 'ghost', current: currentPath === '/login' },
      { label: 'Sign Up', href: '/register', variant: 'primary', current: currentPath === '/register' },
    ],
  }
}