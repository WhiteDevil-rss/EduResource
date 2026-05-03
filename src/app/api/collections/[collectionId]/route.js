import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { deleteResourceCollection, updateResourceCollection } from '@/lib/server-data'

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const { collectionId } = await params
    const body = await request.json().catch(() => ({}))
    const collection = await updateResourceCollection({ collectionId, session, payload: body })
    return withNoStore(NextResponse.json({ collection }))
  } catch (error) {
    return jsonError(error, 'Could not update collection.')
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const { collectionId } = await params
    await deleteResourceCollection({ collectionId, session })
    return withNoStore(NextResponse.json({ ok: true }))
  } catch (error) {
    return jsonError(error, 'Could not delete collection.')
  }
}
