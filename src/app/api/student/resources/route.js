import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { searchResourceRecords } from '@/lib/server-data'

export async function GET(request) {
  try {
    await requireApiSession(request, ['student'])
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''
    const subject = searchParams.get('subject') || ''
    const classFilter = searchParams.get('class') || ''

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
