'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, X, Users, Receipt, DollarSign } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface Notification {
  id: string
  title: string
  message: string
  type: 'GROUP_EXPENSE_ADDED' | 'GROUP_EXPENSE_SETTLED' | 'GROUP_PAYMENT_RECEIVED' | 'BUDGET_ALERT'
  read: boolean
  relatedId?: string
  createdAt: string
}

export default function Notifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchNotifications()
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, markAsRead: true })
      })

      if (response.ok) {
        setNotifications(notifications.map(notification => 
          notificationIds.includes(notification.id) 
            ? { ...notification, read: true }
            : notification
        ))
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'GROUP_EXPENSE_ADDED':
        return <Receipt className="h-5 w-5 text-blue-600" />
      case 'GROUP_EXPENSE_SETTLED':
        return <Check className="h-5 w-5 text-green-600" />
      case 'GROUP_PAYMENT_RECEIVED':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'BUDGET_ALERT':
        return <Bell className="h-5 w-5 text-orange-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-6 border-l-4 ${
              notification.read 
                ? 'border-gray-300 dark:border-gray-600' 
                : 'border-blue-500 dark:border-blue-400'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${
                    notification.read 
                      ? 'text-gray-700 dark:text-gray-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {notification.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead([notification.id])}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className={`mt-1 text-sm ${
                  notification.read 
                    ? 'text-gray-600 dark:text-gray-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You're all caught up! Notifications will appear here when you have activity.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}