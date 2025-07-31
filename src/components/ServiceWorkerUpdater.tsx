'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function ServiceWorkerUpdater() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setShowUpdateBanner(true)
        }
      })

      // Check for updates when page becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) {
              registration.update()
            }
          })
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Force a hard refresh to get the latest version
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowUpdateBanner(false)
  }

  if (!showUpdateBanner) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-primary text-white p-4 rounded-lg shadow-lg border border-primary-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Update Available</h4>
            <p className="text-xs opacity-90 mt-1">
              A new version of Fina is available with performance improvements.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Dismiss update notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-white text-primary px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Update Now'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-white text-xs px-3 py-1.5 hover:text-gray-200 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}