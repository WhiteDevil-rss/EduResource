import { NextResponse } from 'next/server'
import { jsonError, requireApiSession } from '@/lib/api-security'
import { getResourceRecordById } from '@/lib/server-data'
import { streamFromDrive } from '@/lib/google-drive'

export async function GET(request, { params }) {
  try {
    const { resourceId } = await params
    requireApiSession(request, ['student', 'faculty', 'admin'])

    const resource = await getResourceRecordById(resourceId)
    if (!resource) {
      return jsonError(new Error('Resource not found.'), 'Resource not found.', 404)
    }

    if (!resource.driveFileId) {
      return jsonError(new Error('This resource does not have a downloadable file associated with it.'), 'File not found.', 404)
    }

    const { stream, fileName, mimeType } = await streamFromDrive(resource.driveFileId)

    const response = new NextResponse(stream)
    
    response.headers.set('Content-Type', mimeType)
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    
    return response
  } catch (error) {
    console.error('Download Error:', error)
    return jsonError(error, 'Could not download the file.')
  }
}
