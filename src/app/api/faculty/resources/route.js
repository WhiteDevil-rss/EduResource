import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { countAuditRecords, createResourceRecord, listResourceRecords } from '@/lib/server-data'
import { uploadToDrive } from '@/lib/google-drive'

function withTimeout(promise, timeoutMs, fallbackValue = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs)
    }),
  ])
}

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['faculty'])
    const resources = await listResourceRecords()
    const visibleResources = resources.filter(
      (entry) => entry.uploadedBy === session.uid || entry.facultyId === session.uid
    )
    const totalDownloads = await countAuditRecords({
      action: 'resource.downloaded',
      targetIds: visibleResources.map((entry) => entry.id),
    })

    return withNoStore(NextResponse.json({ resources: visibleResources, totalDownloads }))
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('Privileged Firebase access is not configured')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
          totalDownloads: 0,
          warning: 'Faculty resources are unavailable until privileged Firebase access is configured.',
        })
      )
    }

    if (message.includes('FIREBASE_PRIVATE_KEY')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
          totalDownloads: 0,
          warning:
            'Faculty resources are unavailable: FIREBASE_PRIVATE_KEY is malformed. Update the private key in environment variables and redeploy.',
        })
      )
    }

    if (message.includes('NOT_FOUND')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
          totalDownloads: 0,
          warning:
            'Resource storage is not configured yet (Firestore not found for the configured project).',
        })
      )
    }

    return jsonError(error, 'Could not load faculty resources.')
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    
    const contentType = request.headers.get('content-type') || ''
    let payload = {}

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      
      if (!file || !(file instanceof File)) {
        throw new Error('A file is required for this resource.')
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      
      // 1. Upload to Google Drive
      const driveData = await uploadToDrive(
        buffer,
        file.name,
        file.type,
        process.env.GOOGLE_DRIVE_FOLDER_ID
      )

      // 2. Upload Preview to Cloudinary (optional/best-effort)
      let previewData = null
      try {
        previewData = await withTimeout(
          (async () => {
            const { uploadPreview } = await import('@/lib/cloudinary')
            return uploadPreview(buffer, file.name, file.type)
          })(),
          3500,
          null
        )

        if (!previewData) {
          console.warn('Preview upload timed out or unavailable, continuing without preview.')
        }
      } catch (error) {
        console.warn('Preview upload failed, continuing without preview:', error?.message || error)
      }

      const fileUrl =
        driveData.webViewLink ||
        (driveData.fileId
          ? `https://drive.google.com/file/d/${driveData.fileId}/view?usp=drivesdk`
          : '')

      payload = {
        title: formData.get('title') || file.name,
        subject: formData.get('subject'),
        class: formData.get('class'),
        summary: formData.get('summary'),
        category: formData.get('category'),
        fileUrl,
        driveFileId: driveData.fileId,
        driveFileLink: fileUrl,
        fileType: file.type,
        fileSize: file.size,
        fileFormat: file.name.split('.').pop(),
        previewUrl: previewData?.url || '',
        previewPublicId: previewData?.publicId || '',
        status: formData.get('status') || 'live'
      }
    } else {
      payload = await request.json()
    }

    const resource = await createResourceRecord({
      session,
      payload,
    })

    return withNoStore(NextResponse.json({ resource }, { status: 201 }))
  } catch (error) {
    console.error('Resource Creation Error:', error)
    return jsonError(error, 'Could not create the resource.')
  }
}
