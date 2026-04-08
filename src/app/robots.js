export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/dashboard/'],
    },
    sitemap: 'https://edu-resource.vercel.app/sitemap.xml',
  }
}
