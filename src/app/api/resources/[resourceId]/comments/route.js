import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  createResourceComment,
  deleteResourceComment,
  listResourceComments,
} from '@/lib/server-data'

export async function GET(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const { resourceId } = await params
    const comments = await listResourceComments(resourceId, { viewer: session })
    return withNoStore(NextResponse.json({ comments }))
  } catch (error) {
    return jsonError(error, 'Could not load comments.')
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const { resourceId } = await params
    const body = await request.json().catch(() => ({}))
    const comment = await createResourceComment({
      resourceId,
      author: session,
      body: body?.body,
      visibility: body?.visibility,
      parentId: body?.parentId,
    })
    return withNoStore(NextResponse.json({ comment }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not create comment.')
  }
}

export async function DELETE(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    await deleteResourceComment({ commentId: body?.commentId, actor: session })
    return withNoStore(NextResponse.json({ success: true }))
  } catch (error) {
    return jsonError(error, 'Could not delete comment.')
  }
}
