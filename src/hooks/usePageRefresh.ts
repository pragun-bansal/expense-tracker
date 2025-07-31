import { useEffect, useState } from 'react'

export function usePageRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshPage = () => {
    setIsRefreshing(true)
    // Force a hard refresh to bypass cache
    window.location.reload()
  }

  const softRefresh = () => {
    // Soft refresh - just reload current page data
    window.location.href = window.location.href
  }

  // Check if page needs refresh due to updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check if we need to refresh data
        const lastUpdate = localStorage.getItem('lastCacheUpdate')
        const now = Date.now()
        
        // If it's been more than 5 minutes, suggest refresh
        if (lastUpdate && now - parseInt(lastUpdate) > 5 * 60 * 1000) {
          // Could show a toast or banner here
          console.log('Data may be stale, consider refreshing')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return {
    isRefreshing,
    refreshPage,
    softRefresh
  }
}