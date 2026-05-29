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
  deleteResourceRecord,
  updateResourceRecord,
  updateResourceStatusRecord,
} from '@/lib/server-data'
import { uploadToDrive } from '@/lib/google-drive'
import { sanitizeFileName, sanitizePlainText } from '@/lib/request-validation'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
])

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase()
  if (normalized === 'application/pdf') return 'pdf'
  return 'bin'
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    const routeParams = await params
    const resourceId = String(routeParams?.resourceId || '').trim()

    if (!resourceId) {
      return withNoStore(
        NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let body = {}

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')

      body = {
        title: sanitizePlainText(formData.get('title') || '', { maxLength: 160, collapseWhitespace: true }),
        subject: sanitizePlainText(formData.get('subject') || '', { maxLength: 80, collapseWhitespace: true }),
        class: sanitizePlainText(formData.get('class') || '', { maxLength: 80, collapseWhitespace: true }),
        summary: sanitizePlainText(formData.get('summary') || '', { maxLength: 2000 }),
        category: sanitizePlainText(formData.get('category') || '', { maxLength: 80, collapseWhitespace: true }),
        status: formData.get('status') || 'live',
      }

      if (file && file instanceof File && file.size > 0) {
        if (!ALLOWED_UPLOAD_TYPES.has(String(file.type || '').toLowerCase())) {
          throw new ApiError(400, 'Unsupported file type. Only PDF is allowed.')
        }

        if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
          throw new ApiError(400, 'File size must be 25MB or less.')
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

        // Upload new file to Google Drive
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

        body.fileUrl = fileUrl
        body.driveFileId = driveData.fileId
        body.driveFileLink = fileUrl
        body.fileType = file.type
        body.fileSize = file.size
        body.fileFormat = safeExtension
      } else {
        const existingFileUrl = formData.get('fileUrl')
        if (existingFileUrl) {
          body.fileUrl = sanitizePlainText(existingFileUrl, { maxLength: 500, collapseWhitespace: true })
        }
      }
    } else {
      body = await request.json().catch(() => ({}))
    }

    const action = sanitizePlainText(body?.action || '', {
      maxLength: 40,
      collapseWhitespace: true,
    }).toLowerCase()
    const statusOnlyUpdate = action === 'toggle-status' || (body?.status && !body?.title && !body?.subject && !body?.class)

    const resource = statusOnlyUpdate
      ? await updateResourceStatusRecord({
          resourceId,
          session,
          status: body?.status,
        })
      : await updateResourceRecord({
          resourceId,
          session,
          payload: body,
        })

    await logAction({
      user: session,
      action: 'UPDATE_RESOURCE',
      description: `Updated resource ${resource.title || resource.id}.`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resource.id,
      targetRole: 'resource',
    })

    return withNoStore(NextResponse.json({ resource }))
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'UPDATE_RESOURCE',
      description: 'Failed resource update attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not update the resource.')
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['faculty'])
    const routeParams = await params
    const resourceId = String(routeParams?.resourceId || '').trim()

    if (!resourceId) {
      return withNoStore(
        NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
      )
    }

    await deleteResourceRecord({
      resourceId,
      session,
    })

    await logAction({
      user: session,
      action: 'DELETE_RESOURCE',
      description: `Deleted resource ${resourceId}.`,
      module: 'Resources',
      status: 'SUCCESS',
      request,
      targetId: resourceId,
      targetRole: 'resource',
    })

    return withNoStore(NextResponse.json({ ok: true }))
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['faculty']).catch(() => null),
      action: 'DELETE_RESOURCE',
      description: 'Failed resource delete attempt.',
      module: 'Resources',
      status: 'FAILED',
      request,
      targetId: (await params)?.resourceId || null,
      targetRole: 'resource',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not delete the resource.')
  }
}
