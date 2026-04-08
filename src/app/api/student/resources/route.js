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

    const resources = await searchResourceRecords({
      searchTerm,
      subject,
      classFilter,
      status: 'live',
    })

    return withNoStore(NextResponse.json({ resources }))
  } catch (error) {
    return jsonError(error, 'Could not load the student catalog.')
  }
}
