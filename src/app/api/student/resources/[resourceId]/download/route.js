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
      return jsonError(new Error('This resource does not have a downloadable file associated with it.'), 'File not found.', 404)
    }

    const { stream, fileName, mimeType } = await streamFromDrive(resource.driveFileId)

    await logAction({
      user: {
        uid: session.uid,
        email: session.email,
        name: session.name,
        role: session.role,
      },
      action: 'DOWNLOAD_RESOURCE',
      description: `Downloaded resource "${resource.title}".`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resource.id,
      targetRole: 'resource',
    })

    const response = new NextResponse(stream)
    
    response.headers.set('Content-Type', mimeType)
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    
    return response
  } catch (error) {
    console.error('Download Error:', error)
    await logAction({
      user: await requireApiSession(request, ['student', 'faculty', 'admin']).catch(() => null),
      action: 'DOWNLOAD_RESOURCE',
      description: 'Failed resource download attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not download the file.')
  }
}
