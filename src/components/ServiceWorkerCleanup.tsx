'use client'

import { useEffect } from 'react'

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    // Unregister any existing service workers to eliminate caching issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister().then(function(success) {
            if (success) {
              console.log('Service Worker unregistered successfully')
            }
          })
        }
      })
    }

    // Clear any PWA-related classes
    document.body.classList.remove('pwa-mode')
    
    // Remove PWA install function
    if ((window as any).installPWA) {
      delete (window as any).installPWA
    }

  }, [])

  return null // This component doesn't render anything
}