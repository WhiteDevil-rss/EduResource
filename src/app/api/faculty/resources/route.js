import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { createResourceRecord, listResourceRecords } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = requireApiSession(request, ['faculty'])
    const resources = await listResourceRecords()
    const visibleResources = resources.filter(
      (entry) => entry.uploadedBy === session.uid || entry.facultyId === session.uid
    )

    return withNoStore(NextResponse.json({ resources: visibleResources }))
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('NOT_FOUND')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
          warning:
            'Resource storage is not configured yet (Firestore not found for the configured project).',
        })
      )
    }

    return jsonError(error, 'Could not load faculty resources.')
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = requireApiSession(request, ['faculty'])
    const body = await request.json()
    const resource = await createResourceRecord({
      session,
      payload: body,
    })

    return withNoStore(NextResponse.json({ resource }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not create the resource.')
  }
}
