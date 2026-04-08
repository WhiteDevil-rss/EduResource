import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { toggleCollectionSaveForStudent } from '@/lib/server-data'

export async function POST(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student'])
    const { collectionId } = await params
    const result = await toggleCollectionSaveForStudent({ student: session, collectionId })
    return withNoStore(NextResponse.json(result))
  } catch (error) {
    return jsonError(error, 'Could not update saved collection.')
  }
}
