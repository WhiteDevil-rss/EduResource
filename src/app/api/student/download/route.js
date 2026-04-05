import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/api-security'
import { createAuditRecord, getResourceRecordById } from '@/lib/server-data'
import { signDownloadUrl } from '@/lib/cloudinary'

export async function GET(request) {
  try {
    // 1. Authenticate the student session
    const session = await requireApiSession(request, ['student'])
    // 2. Extract resourceId from query params
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('resourceId')
    
    if (!resourceId) {
      throw new Error('Resource ID is required.')
    }

    // 3. Fetch the resource metadata
    const resource = await getResourceRecordById(resourceId)
    
    if (!resource) {
      throw new Error('Resource not found or deleted.')
    }

    if (resource.status !== 'live') {
      throw new Error('This resource is not currently available for download.')
    }

    await createAuditRecord({
      actorUid: session.uid,
      actorRole: session.role,
      action: 'resource.downloaded',
      targetId: resource.id,
      targetRole: 'resource',
      message: `Downloaded resource "${resource.title}".`,
    })

    // 4. Generate a signed Cloudinary URL with the attachment flag
    // This allows access to restricted assets and forces download to prevent framing errors.
    const downloadUrl = signDownloadUrl(resource.fileUrl)

    // 5. Redirect the student to the secure download link
    return NextResponse.redirect(new URL(downloadUrl))
  } catch (error) {
    console.error('Download error:', error)
    
    // Redirect back to dashboard with error instead of showing raw JSON or Chrome's error page
    const dashboardUrl = new URL('/dashboard/student', request.url)
    dashboardUrl.searchParams.set('error', 'download_failed')
    return NextResponse.redirect(dashboardUrl)
  }
}
