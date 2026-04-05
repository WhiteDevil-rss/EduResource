import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { updateResourceRequestStatus } from '@/lib/server-data'

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['admin'])
    const body = await request.json().catch(() => ({}))
    const routeParams = await params
    const requestId = String(routeParams?.requestId || '').trim()

    if (!requestId) {
      return withNoStore(
        NextResponse.json({ error: 'Request ID is required.' }, { status: 400 })
      )
    }

    const resourceRequest = await updateResourceRequestStatus({
      requestId,
      status: body?.status,
      actorUid: session.uid,
      actorRole: session.role,
    })

    return withNoStore(NextResponse.json({ request: resourceRequest }))
  } catch (error) {
    return jsonError(error, 'Could not update the resource request.')
  }
}
