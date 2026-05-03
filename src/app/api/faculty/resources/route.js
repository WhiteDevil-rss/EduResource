import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
  ApiError,
} from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { 
  countAuditRecords, 
  createResourceRecord, 
  listResourceRecordsByOwner,
  getRecentAuditCount
} from '@/lib/server-data'
import { uploadToDrive } from '@/lib/google-drive'
import { sanitizeFileName, sanitizePlainText } from '@/lib/request-validation'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase()
  if (normalized === 'application/pdf') return 'pdf'
  if (normalized === 'application/msword') return 'doc'
  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  return 'bin'
}

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['faculty'])
    const { searchParams } = new URL(request.url)
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 200)))
    const includeMetrics = searchParams.get('includeMetrics') === '1'

    const visibleResources = await listResourceRecordsByOwner(session.uid, { limit })
    const totalDownloads = includeMetrics
      ? await countAuditRecords({
          action: 'resource.downloaded',
          targetIds: visibleResources.map((entry) => entry.id),
        })
      : 0

    return withNoStore(
      NextResponse.json({
        resources: visibleResources,
        totalDownloads,
        pagination: { limit, total: visibleResources.length },
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'VIEW_RESOURCES',
      description: 'Failed to load faculty resources.',
      module: 'Resources',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
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
    
    // Rate limit: 5 uploads per 10 minutes
    const recentUploadCount = await getRecentAuditCount(session.uid, 'resource.created', 600000)
    if (recentUploadCount >= 5) {
      throw new ApiError(429, 'Rate limit exceeded: You can only upload 5 resources every 10 minutes.')
    }
    
    const contentType = request.headers.get('content-type') || ''
    let payload = {}

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      
      if (!file || !(file instanceof File)) {
        throw new Error('A file is required for this resource.')
      }

      if (!ALLOWED_UPLOAD_TYPES.has(String(file.type || '').toLowerCase())) {
        throw new ApiError(400, 'Unsupported file type.')
      }

      if (Number(file.size || 0) <= 0 || Number(file.size || 0) > MAX_UPLOAD_BYTES) {
        throw new ApiError(400, 'File size must be between 1 byte and 25MB.')
      }

      const originalFileName = String(file.name || '').trim()
      if (!originalFileName || originalFileName.length > 180) {
        throw new ApiError(400, 'Invalid file name.')
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const safeBaseName = sanitizeFileName(originalFileName)
      if (safeBaseName === 'upload' || !/[a-zA-Z0-9]/.test(safeBaseName)) {
        throw new ApiError(400, 'Invalid file name.')
      }
      const safeExtension = extensionForMimeType(file.type)
      const safeUploadName = `${safeBaseName.replace(/\.[^.]+$/, '')}-${crypto.randomUUID().slice(0, 8)}.${safeExtension}`
      
      // 1. Upload to Google Drive
      const driveData = await uploadToDrive(
        buffer,
        safeUploadName,
        file.type,
        process.env.GOOGLE_DRIVE_FOLDER_ID
      )

      const fileUrl =
        driveData.webViewLink ||
        (driveData.fileId
          ? `https://drive.google.com/file/d/${driveData.fileId}/view?usp=drivesdk`
          : '')

      payload = {
        title: sanitizePlainText(formData.get('title') || safeBaseName, { maxLength: 160, collapseWhitespace: true }),
        subject: sanitizePlainText(formData.get('subject'), { maxLength: 80, collapseWhitespace: true }),
        class: sanitizePlainText(formData.get('class'), { maxLength: 80, collapseWhitespace: true }),
        summary: sanitizePlainText(formData.get('summary'), { maxLength: 2000 }),
        category: sanitizePlainText(formData.get('category'), { maxLength: 80, collapseWhitespace: true }),
        fileUrl,
        driveFileId: driveData.fileId,
        driveFileLink: fileUrl,
        fileType: file.type,
        fileSize: file.size,
        fileFormat: safeExtension,
        status: formData.get('status') || 'live'
      }
    } else {
      payload = await request.json().catch(() => {
        throw new ApiError(400, 'Invalid JSON in request body.')
      })
    }

    const resource = await createResourceRecord({
      session,
      payload,
    })

    await logAction({
      user: session,
      action: 'UPLOAD_RESOURCE',
      description: `Uploaded resource ${resource.title || resource.id}.`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resource.id,
      targetRole: 'resource',
    })

    return withNoStore(NextResponse.json({ resource }, { status: 201 }))
  } catch (error) {
    console.error('Resource Creation Error:', error)
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'UPLOAD_RESOURCE',
      description: 'Failed resource upload attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not create the resource.')
  }
}
