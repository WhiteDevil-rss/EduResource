'use client'
import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: 'linear-gradient(155deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent 34%), var(--surface-card)',
          color: 'var(--foreground)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, var(--primary) 28%)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card)',
        },
        iconTheme: {
          primary: 'var(--primary)',
          secondary: 'var(--primary-foreground)',
        },
        success: {
          style: {
            border: '1px solid color-mix(in srgb, var(--success) 45%, var(--border) 55%)',
            background: 'linear-gradient(150deg, color-mix(in srgb, var(--success) 12%, transparent), transparent 34%), var(--surface-card)',
          },
          iconTheme: {
            primary: 'var(--success)',
            secondary: '#ffffff',
          },
        },
        error: {
          style: {
            border: '1px solid color-mix(in srgb, var(--danger) 48%, var(--border) 52%)',
            background: 'linear-gradient(150deg, color-mix(in srgb, var(--danger) 12%, transparent), transparent 34%), var(--surface-card)',
          },
          iconTheme: {
            primary: 'var(--danger)',
            secondary: '#ffffff',
          },
        },
      }}
    />
  )
}
