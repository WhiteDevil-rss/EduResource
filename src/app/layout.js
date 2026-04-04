import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import ToastProvider from '@/components/ToastProvider'
import Script from 'next/script'

export const metadata = {
  title: 'EduResource Hub | The Digital Curator',
  description:
    'A role-based academic resource platform for admins, faculty, and students.',
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
