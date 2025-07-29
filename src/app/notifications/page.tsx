'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, X, Users, Receipt, DollarSign, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'
import { useModal } from '@/hooks/useModal'

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
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-heading">Notifications</h1>
          <p className="mt-2 text-sm text-body">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-card px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-card rounded-lg shadow-card p-6 border-l-4 ${
              notification.read 
                ? 'border-input' 
                : 'border-status-info'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${
                    notification.read 
                      ? 'text-input-label' 
                      : 'text-heading'
                  }`}>
                    {notification.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-link hover:text-link-hover rounded-full hover:bg-blue-100"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className={`mt-1 text-sm ${
                  notification.read 
                    ? 'text-body' 
                    : 'text-input-label'
                }`}>
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-heading">No notifications</h3>
            <p className="mt-1 text-sm text-muted">
              You're all caught up! Notifications will appear here when you have activity.
            </p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={closeAlert}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          confirmText={alertModal.confirmText}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
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
      )}
    </div>
  )
}