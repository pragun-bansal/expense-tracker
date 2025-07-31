'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register the service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available, prompt user to refresh
                  if (confirm('A new version of the app is available. Refresh to update?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data)
      })
    }

    // Check if app is running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://')

    if (isStandalone) {
      console.log('App is running as PWA')
      document.body.classList.add('pwa-mode')
    }

    // Handle install prompt
    let deferredPrompt: any = null

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Store the event so it can be triggered later
      deferredPrompt = e
      
      // Show install button or banner (you can customize this)
      console.log('PWA install prompt available')
    })

    // Handle successful installation
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA was installed')
      deferredPrompt = null
    })

    // Function to trigger install (you can call this from a button)
    ;(window as any).installPWA = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt')
          } else {
            console.log('User dismissed the install prompt')
          }
          deferredPrompt = null
        })
      }
    }

  }, [])

  return null // This component doesn't render anything
}