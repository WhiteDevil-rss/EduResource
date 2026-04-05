import { NextResponse } from 'next/server'

export async function GET() {
  const envStatus = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_API_KEY: !!process.env.FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY:
      !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !!process.env.FIREBASE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  const allSet = Object.values(envStatus).every(v => v === true || v === 'production' || v === 'development')
  
  return NextResponse.json({
    status: allSet ? 'ok' : 'missing_vars',
    config: envStatus
  })
}
