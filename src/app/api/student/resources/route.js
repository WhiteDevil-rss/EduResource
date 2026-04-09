import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { searchResourceRecords } from '@/lib/server-data'
import { sanitizePlainText, validateSearchTerm } from '@/lib/request-validation'

export async function GET(request) {
  try {
    await requireApiSession(request, ['student'])
    const { searchParams } = new URL(request.url)
    const searchTerm = validateSearchTerm(searchParams.get('q') || '', 160)
    const subject = sanitizePlainText(searchParams.get('subject') || '', {
      maxLength: 80,
      collapseWhitespace: true,
    })
    const classFilter = sanitizePlainText(searchParams.get('class') || '', {
      maxLength: 80,
      collapseWhitespace: true,
    })
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') || 120)))

    const resources = await searchResourceRecords({
      searchTerm,
      subject,
      classFilter,
      status: 'live',
      limit,
    })

    const minimalResources = resources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      subject: resource.subject,
      class: resource.class,
      summary: resource.summary,
      fileUrl: resource.fileUrl,
      facultyName: resource.facultyName,
      facultyEmail: resource.facultyEmail,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      uploadStatus: resource.uploadStatus || resource.status,
      uploadProgress: resource.uploadProgress,
      isBookmarked: resource.isBookmarked,
    }))

    return withNoStore(NextResponse.json({ resources: minimalResources, pagination: { limit, total: minimalResources.length } }))
  } catch (error) {
    return jsonError(error, 'Could not load the student catalog.')
  }
}
