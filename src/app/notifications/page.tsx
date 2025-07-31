'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, X, Users, Receipt, DollarSign, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useModal } from '@/hooks/useModal'

// Lazy load modal components
const AlertModal = lazy(() => import('@/components/AlertModal'))
const ConfirmModal = lazy(() => import('@/components/ConfirmModal'))

interface Notification {
  id: string
  title: string
  message: string
  type: 'GROUP_EXPENSE_ADDED' | 'GROUP_EXPENSE_SETTLED' | 'GROUP_PAYMENT_RECEIVED' | 'BUDGET_ALERT' | 'BUDGET_WARNING' | 'GROUP_MEMBER_ADDED' | 'GROUP_MEMBER_REMOVED' | 'EXPENSE_REMINDER' | 'PAYMENT_REMINDER' | 'ACCOUNT_LOW_BALANCE'
  read: boolean
  relatedId?: string
  createdAt: string
  icon?: string
  color?: string
  priority?: 'low' | 'medium' | 'high'
  actionUrl?: string
}

export default function Notifications() {
  const { data: session } = useSession()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
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

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        ))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (response.ok) {
        setNotifications(notifications.map(notification => 
          ({ ...notification, read: true })
        ))
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(notifications.filter(notification => 
          notification.id !== notificationId
        ))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const deleteAllNotifications = async () => {
    const confirmed = await showConfirm({
      title: 'Delete All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      confirmText: 'Delete All',
      type: 'danger'
    })
    
    if (!confirmed) {
      closeConfirm()
      return
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      })

      if (response.ok) {
        closeConfirm()
        setNotifications([])
      } else {
        closeConfirm()
        showAlert({
          title: 'Delete Failed',
          message: 'Failed to delete all notifications',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error)
      closeConfirm()
      showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete all notifications',
        type: 'error'
      })
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    // Use the icon from the notification if available
    if (notification.icon) {
      return <span className="text-base">{notification.icon}</span>
    }

    // Fallback to icon based on type
    switch (notification.type) {
      case 'GROUP_EXPENSE_ADDED':
        return <Receipt className="h-5 w-5 text-blue-600" />
      case 'GROUP_EXPENSE_SETTLED':
        return <Check className="h-5 w-5 text-green-600" />
      case 'GROUP_PAYMENT_RECEIVED':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'BUDGET_ALERT':
        return <Bell className="h-5 w-5 text-red-600" />
      case 'BUDGET_WARNING':
        return <Bell className="h-5 w-5 text-yellow-600" />
      case 'GROUP_MEMBER_ADDED':
      case 'GROUP_MEMBER_REMOVED':
        return <Users className="h-5 w-5 text-blue-600" />
      case 'EXPENSE_REMINDER':
      case 'PAYMENT_REMINDER':
        return <Bell className="h-5 w-5 text-orange-600" />
      case 'ACCOUNT_LOW_BALANCE':
        return <DollarSign className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Notifications</h1>
          <p className="mt-1 text-sm text-body">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div className="flex flex-row gap-2 sm:gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              className="flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Delete All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-card rounded-lg border-l-4 p-4 hover:shadow-sm transition-all ${
              notification.read 
                ? 'border-gray-200 shadow-sm' 
                : 'border-blue-500 shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm sm:text-base font-medium leading-tight ${
                      notification.read 
                        ? 'text-gray-600' 
                        : 'text-heading'
                    }`}>
                      {notification.title}
                    </h3>
                    <p className={`mt-1 text-xs sm:text-sm leading-relaxed ${
                      notification.read 
                        ? 'text-gray-500' 
                        : 'text-body'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">
                    {new Date(notification.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {!notification.read && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-medium text-heading">No notifications</h3>
            <p className="mt-1 text-sm text-muted">
              You're all caught up!
            </p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertModal && (
        <Suspense fallback={<div />}>
          <AlertModal
            isOpen={alertModal?.isOpen || false}
            onClose={closeAlert}
            title={alertModal?.title || ''}
            message={alertModal?.message || ''}
            type={alertModal?.type || 'info'}
            confirmText={alertModal.confirmText}
          />
        </Suspense>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <Suspense fallback={<div />}>
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={closeConfirm}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
            type={confirmModal.type}
            loading={confirmModal.loading}
          />
        </Suspense>
      )}
    </div>
  )
}