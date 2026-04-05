import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import {
  deleteResourceRecord,
  updateResourceRecord,
} from '@/lib/server-data'

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    const body = await request.json()
    const routeParams = await params
    const resourceId = String(routeParams?.resourceId || '').trim()

    if (!resourceId) {
      return withNoStore(
        NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
      )
    }

    const resource = await updateResourceRecord({
      resourceId,
      session,
      payload: body,
    })

    return withNoStore(NextResponse.json({ resource }))
  } catch (error) {
    return jsonError(error, 'Could not update the resource.')
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    const routeParams = await params
    const resourceId = String(routeParams?.resourceId || '').trim()

    if (!resourceId) {
      return withNoStore(
        NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
      )
    }

    await deleteResourceRecord({
      resourceId,
      session,
    })

    return withNoStore(NextResponse.json({ ok: true }))
  } catch (error) {
    return jsonError(error, 'Could not delete the resource.')
  }
}
