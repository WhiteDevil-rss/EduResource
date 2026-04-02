'use client'
import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster 
      position="top-center" 
      toastOptions={{
        style: {
          background: '#1c1f2b',
          color: '#f0f0fd',
          border: '1px solid rgba(115, 117, 128, 0.15)',
          borderRadius: '12px'
        }
      }}
    />
  )
}
