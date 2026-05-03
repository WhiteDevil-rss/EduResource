export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/api/', '/maintenance'],
    },
    sitemap: 'https://sps.zembaa.com/sitemap.xml',
  }
}
