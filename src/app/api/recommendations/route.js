import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { getPersonalizedRecommendations } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const recommendations = await getPersonalizedRecommendations({ user: session })
    return withNoStore(NextResponse.json({ recommendations }))
  } catch (error) {
    return jsonError(error, 'Could not load recommendations.')
  }
}
