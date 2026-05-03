import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { GlobalErrorBoundary } from '@/components/ErrorBoundary'
import ToastProvider from '@/components/ToastProvider'
import Script from 'next/script'
import { preinit } from 'react-dom'
import RootLayoutClient from '@/components/layout/RootLayoutClient'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-RECK6F2WB4'

export const metadata = {
  title: {
    default: 'SPS Educationam | Premier Coaching Classes & Student Learning Platform',
    template: '%s | SPS Educationam',
  },
  description:
    'SPS Educationam is a specialized student learning platform offering academic support, expert coaching classes, and curated study resources for Class 10th, 11th, and 12th students.',
  keywords: ['coaching classes', 'student learning', 'academic support', 'online education platform', 'expert study materials', 'board exam preparation'],
  authors: [{ name: 'SPS Educationam Team' }],
  creator: 'SPS Educationam',
  metadataBase: new URL('https://sps.zembaa.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sps.zembaa.com',
    title: 'SPS Educationam | Premier Coaching Classes & Student Learning Platform',
    description: 'Empowering students with high-quality academic support and expert study materials.',
    siteName: 'SPS Educationam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPS Educationam | Premier Coaching Classes & Student Learning Platform',
    description: 'Empowering students with high-quality academic support and expert study materials.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  // Use React 19's native preinit API to inject the theme script into the head
  // without rendering a tag in the React tree that could trigger hydration warnings.
  preinit('/theme-init.js', { as: 'script' })

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <a href="#main-content" className="skip-link sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background">
          Skip to Content
        </a>

        <GlobalErrorBoundary>
          <AuthProvider>
            <RootLayoutClient>
              {children}
            </RootLayoutClient>
          </AuthProvider>
        </GlobalErrorBoundary>

        <ToastProvider />

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true,
            });
          `}
        </Script>
      </body>
    </html>
  )
}
