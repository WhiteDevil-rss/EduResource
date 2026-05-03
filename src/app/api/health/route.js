import { NextResponse } from 'next/server'

export async function GET() {
  const firebaseApiKeySet =
    !!process.env.FIREBASE_API_KEY || !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY

  const envStatus = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_API_KEY: firebaseApiKeySet,
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKeySet,
    NODE_ENV: process.env.NODE_ENV,
  }

  const allSet =
    envStatus.FIREBASE_PROJECT_ID &&
    envStatus.FIREBASE_CLIENT_EMAIL &&
    envStatus.FIREBASE_PRIVATE_KEY &&
    firebaseApiKeySet &&
    (envStatus.NODE_ENV === 'production' || envStatus.NODE_ENV === 'development')
  
  const isProduction = process.env.NODE_ENV === 'production'
  
  return NextResponse.json({
    status: allSet ? 'ok' : 'missing_vars',
    ...(isProduction ? {} : { config: envStatus })
  })
}
