import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import ToastProvider from '@/components/ToastProvider'
import Script from 'next/script'

export const metadata = {
  title: {
    default: 'EDUCATIONAM | Intelligent Academic Resource Platform',
    template: '%s | EDUCATIONAM',
  },
  description:
    'A high-performance, role-based academic resource platform. Empowering students and faculty with seamless resource management and secure collaboration.',
  keywords: ['education', 'academic resources', 'student platform', 'faculty workspace', 'SaaS'],
  authors: [{ name: 'EDUCATIONAM Team' }],
  creator: 'EDUCATIONAM',
  metadataBase: new URL('https://edu-resource.vercel.app'), // Placeholder URL
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://edu-resource.vercel.app',
    title: 'EDUCATIONAM | Intelligent Academic Resource Platform',
    description: 'Empowering students and faculty with seamless resource management and secure collaboration.',
    siteName: 'EDUCATIONAM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EDUCATIONAM | Intelligent Academic Resource Platform',
    description: 'Empowering students and faculty with seamless resource management and secure collaboration.',
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
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        {process.env.NODE_ENV === 'development' ? (
          <Script id="clipboard-focus-guard" strategy="beforeInteractive">
            {`
              (function () {
                if (!navigator.clipboard || !navigator.clipboard.writeText) {
                  return;
                }

                const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
                navigator.clipboard.writeText = async function (text) {
                  if (typeof document !== 'undefined' && !document.hasFocus()) {
                    return Promise.resolve();
                  }

                  return originalWriteText(text);
                };
              })();
            `}
          </Script>
        ) : null}
        <a href="#main-content" className="skip-link">Skip to Content</a>
        <AuthProvider>
          <main id="main-content">{children}</main>
        </AuthProvider>
        <ToastProvider />
      </body>
    </html>
  )
}
