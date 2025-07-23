'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/contexts/ToastContext'
import { NotificationWithMetadata } from '@/lib/notifications'

export function useNotifications() {
  const { data: session } = useSession()
  const { addToast } = useToast()
  const [notifications, setNotifications] = useState<NotificationWithMetadata[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const newNotifications = await response.json()
        
        // Check for new notifications since last check
        const newItems = newNotifications.filter((notif: NotificationWithMetadata) => 
          new Date(notif.createdAt) > lastChecked && !notif.read
        )

        // Show toast notifications for new items
        newItems.forEach((notif: NotificationWithMetadata) => {
          addToast({
            type: getToastType(notif.priority),
            title: notif.title,
            message: notif.message,
            duration: notif.priority === 'high' ? 8000 : 5000,
            action: notif.actionUrl ? {
              label: 'View',
              onClick: () => window.location.href = notif.actionUrl!
            } : undefined
          })
        })

        setNotifications(newNotifications)
        setLastChecked(new Date())
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, addToast, lastChecked])

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications?count=true')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [session?.user?.id])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        )
        // Update unread count if the deleted notification was unread
        const deletedNotification = notifications.find(n => n.id === notificationId)
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [notifications])

  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      })

      if (response.ok) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error)
    }
  }, [])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!session?.user?.id) return

    fetchNotifications()
    fetchUnreadCount()
    
    const interval = setInterval(() => {
      fetchNotifications()
      fetchUnreadCount()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [session?.user?.id, fetchNotifications, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications
  }
}

function getToastType(priority: 'low' | 'medium' | 'high'): 'success' | 'error' | 'warning' | 'info' {
  switch (priority) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
    default:
      return 'info'
  }
}