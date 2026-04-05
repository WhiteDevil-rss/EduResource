import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { createResourceRecord, listResourceRecords } from '@/lib/server-data'
import { uploadToDrive } from '@/lib/google-drive'
import { uploadPreview } from '@/lib/cloudinary'

export async function GET(request) {
  try {
    const session = requireApiSession(request, ['faculty'])
    const resources = await listResourceRecords()
    const visibleResources = resources.filter(
      (entry) => entry.uploadedBy === session.uid || entry.facultyId === session.uid
    )

    return withNoStore(NextResponse.json({ resources: visibleResources }))
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('Privileged Firebase access is not configured')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
          warning: 'Faculty resources are unavailable until privileged Firebase access is configured.',
        })
      )
    }

    if (message.includes('NOT_FOUND')) {
      return withNoStore(
        NextResponse.json({
          resources: [],
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
    const session = requireApiSession(request, ['faculty'])
    
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
      const previewData = await uploadPreview(buffer, file.name, file.type)

      payload = {
        title: formData.get('title') || file.name,
        subject: formData.get('subject'),
        class: formData.get('class'),
        summary: formData.get('summary'),
        category: formData.get('category'),
        fileUrl: driveData.webViewLink,
        driveFileId: driveData.fileId,
        driveFileLink: driveData.webViewLink,
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
