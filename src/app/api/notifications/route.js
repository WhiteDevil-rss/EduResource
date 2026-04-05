import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  countUnreadNotificationRecords,
  listNotificationRecords,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const notifications = await listNotificationRecords(session.uid)
    const unreadCount = await countUnreadNotificationRecords(session.uid)

    return withNoStore(
      NextResponse.json({
        notifications,
        unreadCount,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load notifications.')
  }
}

export async function PATCH(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '').trim().toLowerCase()

    if (action === 'read-all') {
      const clearedCount = await markAllNotificationsAsRead(session.uid)
      const notifications = await listNotificationRecords(session.uid)
      const unreadCount = await countUnreadNotificationRecords(session.uid)

      return withNoStore(
        NextResponse.json({
          notifications,
          unreadCount,
          clearedCount,
        })
      )
    }

    const notificationId = String(body?.notificationId || '').trim()
    if (!notificationId) {
      return withNoStore(
        NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 })
      )
    }

    const notification = await markNotificationAsRead({
      notificationId,
      recipientUid: session.uid,
    })

    if (!notification) {
      return withNoStore(
        NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
      )
    }

    const notifications = await listNotificationRecords(session.uid)
    const unreadCount = await countUnreadNotificationRecords(session.uid)

    return withNoStore(
      NextResponse.json({
        notification,
        notifications,
        unreadCount,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not update notifications.')
  }
}