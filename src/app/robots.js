export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/api/', '/maintenance'],
    },
    sitemap: 'https://edu-resource.pages.dev/sitemap.xml',
  }
}
