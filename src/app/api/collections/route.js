import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  createResourceCollection,
  listResourceCollections,
  listSavedCollections,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const collections =
      session.role === 'student'
        ? await listSavedCollections(session.uid)
        : await listResourceCollections({
            ownerUid: session.role === 'faculty' ? session.uid : null,
            visibleOnly: false,
          })

    return withNoStore(NextResponse.json({ collections }))
  } catch (error) {
    return jsonError(error, 'Could not load collections.')
  }
}

export async function POST(request) {
  try {
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    const collection = await createResourceCollection({ session, payload: body })
    return withNoStore(NextResponse.json({ collection }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not create collection.')
  }
}
