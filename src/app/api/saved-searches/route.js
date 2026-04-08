import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const savedSearches = await listSavedSearches(session.uid)
    return withNoStore(NextResponse.json({ savedSearches }))
  } catch (error) {
    return jsonError(error, 'Could not load saved searches.')
  }
}

export async function POST(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    const savedSearch = await createSavedSearch({ user: session, payload: body })
    return withNoStore(NextResponse.json({ savedSearch }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not save search.')
  }
}

export async function DELETE(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    await deleteSavedSearch({ searchId: body?.searchId, user: session })
    return withNoStore(NextResponse.json({ success: true }))
  } catch (error) {
    return jsonError(error, 'Could not delete saved search.')
  }
}
