'use client'

import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useEffect } from 'react'

export default function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-sidebar-nav" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}