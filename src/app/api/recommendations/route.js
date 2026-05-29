import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore, applyRateLimit } from '@/lib/api-security'
import { getPersonalizedRecommendations } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    applyRateLimit(request, 'cost-heavy')
    const recommendations = await getPersonalizedRecommendations({ user: session })
    return withNoStore(NextResponse.json({ recommendations }), request)
  } catch (error) {
    return jsonError(error, 'Could not load recommendations.')
  }
}

