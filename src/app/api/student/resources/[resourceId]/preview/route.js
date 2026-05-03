import { NextResponse } from 'next/server'
import { jsonError, requireApiSession } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { getResourceRecordById } from '@/lib/server-data'
import { streamFromDrive } from '@/lib/google-drive'

export async function GET(request, { params }) {
  try {
    const { resourceId } = await params
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])

    const resource = await getResourceRecordById(resourceId)
    if (!resource) {
      return jsonError(new Error('Resource not found.'), 'Resource not found.', 404)
    }

    if (!resource.driveFileId) {
      return jsonError(new Error('This resource does not have a previewable file associated with it.'), 'File not found.', 404)
    }

    const { stream, fileName, mimeType } = await streamFromDrive(resource.driveFileId)

    await logAction({
      user: {
        uid: session.uid,
        email: session.email,
        name: session.name,
        role: session.role,
      },
      action: 'PREVIEW_RESOURCE',
      description: `Previewed resource "${resource.title}".`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resource.id,
      targetRole: 'resource',
    })

    const response = new NextResponse(stream)
    response.headers.set('Content-Type', mimeType)
    response.headers.set('Content-Disposition', `inline; filename="${fileName}"`)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  } catch (error) {
    console.error('Preview Error:', error)
    await logAction({
      user: await requireApiSession(request, ['student', 'faculty', 'admin']).catch(() => null),
      action: 'PREVIEW_RESOURCE',
      description: 'Failed resource preview attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not preview the file.')
  }
}
