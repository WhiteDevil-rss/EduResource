import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  addResourceVersionNote,
  listResourceVersions,
  rollbackResourceVersion,
} from '@/lib/server-data'

export async function GET(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const { resourceId } = await params
    const versions = await listResourceVersions(resourceId)

    return withNoStore(NextResponse.json({ versions, scope: session.role }))
  } catch (error) {
    return jsonError(error, 'Could not load versions.')
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const { resourceId } = await params
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '').trim().toLowerCase()

    if (action === 'rollback') {
      const version = await rollbackResourceVersion({
        resourceId,
        versionId: body?.versionId,
        session,
        note: body?.note,
      })
      return withNoStore(NextResponse.json({ version }))
    }

    const version = await addResourceVersionNote({
      resourceId,
      versionId: body?.versionId,
      session,
      note: body?.note,
    })
    return withNoStore(NextResponse.json({ version }))
  } catch (error) {
    return jsonError(error, 'Could not update version history.')
  }
}
