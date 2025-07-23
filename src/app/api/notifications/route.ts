import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserNotifications, getUnreadNotificationCount } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const countOnly = searchParams.get('count') === 'true'

    if (countOnly) {
      const unreadCount = await getUnreadNotificationCount(session.user.id)
      return NextResponse.json({ unreadCount })
    }

    const notifications = await getUserNotifications(session.user.id, limit)
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, markAllAsRead } = await request.json()
    const { markNotificationAsRead, markAllNotificationsAsRead } = await import('@/lib/notifications')

    if (markAllAsRead) {
      await markAllNotificationsAsRead(session.user.id)
      return NextResponse.json({ message: 'All notifications marked as read' })
    } else if (notificationId) {
      await markNotificationAsRead(notificationId)
      return NextResponse.json({ message: 'Notification marked as read' })
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, deleteAll } = await request.json()
    const { deleteNotification, deleteAllNotifications } = await import('@/lib/notifications')

    if (deleteAll) {
      await deleteAllNotifications(session.user.id)
      return NextResponse.json({ message: 'All notifications deleted' })
    } else if (notificationId) {
      await deleteNotification(notificationId, session.user.id)
      return NextResponse.json({ message: 'Notification deleted' })
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}