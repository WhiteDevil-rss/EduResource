import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import {
  deleteResourceRecord,
  updateResourceRecord,
  updateResourceStatusRecord,
} from '@/lib/server-data'
import { sanitizePlainText } from '@/lib/request-validation'

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    const body = await request.json().catch(() => ({}))
    const routeParams = await params
    const resourceId = String(routeParams?.resourceId || '').trim()

    if (!resourceId) {
      return withNoStore(
        NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
      )
    }

    const action = sanitizePlainText(body?.action || '', {
      maxLength: 40,
      collapseWhitespace: true,
    }).toLowerCase()
    const statusOnlyUpdate = action === 'toggle-status' || (body?.status && !body?.title && !body?.subject && !body?.class)

    const resource = statusOnlyUpdate
      ? await updateResourceStatusRecord({
          resourceId,
          session,
          status: body?.status,
        })
      : await updateResourceRecord({
          resourceId,
          session,
          payload: body,
        })

    await logAction({
      user: session,
      action: 'UPDATE_RESOURCE',
      description: `Updated resource ${resource.title || resource.id}.`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resource.id,
      targetRole: 'resource',
    })

    return withNoStore(NextResponse.json({ resource }))
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'UPDATE_RESOURCE',
      description: 'Failed resource update attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
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

    await logAction({
      user: session,
      action: 'DELETE_RESOURCE',
      description: `Deleted resource ${resourceId}.`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resourceId,
      targetRole: 'resource',
    })

    return withNoStore(NextResponse.json({ ok: true }))
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'DELETE_RESOURCE',
      description: 'Failed resource delete attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not delete the resource.')
  }
}
