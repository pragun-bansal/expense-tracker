'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Component to detect and recover from broken client-side navigation
 * Automatically falls back to full page refresh when Next.js router fails
 */
export function NavigationRecovery() {
  const router = useRouter()

  useEffect(() => {
    // Listen for unhandled errors that might break the router
    const handleError = (event: ErrorEvent) => {
      console.warn('JavaScript error detected, checking navigation health:', event.error)
      
      // Test if router is still working
      setTimeout(() => {
        try {
          // Try to use the router - this will fail if it's broken
          router.prefetch('/')
        } catch (error) {
          console.warn('Router appears broken, will use full page navigation as fallback')
          enableFallbackNavigation()
        }
      }, 1000)
    }

    // Listen for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection detected:', event.reason)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [router])

  return null // This component doesn't render anything
}

/**
 * Enable fallback navigation when Next.js router is broken
 * Converts all Link clicks to full page refreshes
 */
function enableFallbackNavigation() {
  // Find all Next.js Link elements and add fallback behavior
  const addFallbackToLinks = () => {
    const links = document.querySelectorAll('a[href^="/"]')
    
    links.forEach((link) => {
      const htmlLink = link as HTMLAnchorElement
      
      // Skip if already has fallback
      if (htmlLink.dataset.fallbackEnabled) return
      
      htmlLink.dataset.fallbackEnabled = 'true'
      
      // Add click handler for full page navigation
      const fallbackHandler = (e: Event) => {
        e.preventDefault()
        const href = htmlLink.getAttribute('href')
        if (href) {
          console.warn('Using fallback navigation for:', href)
          window.location.href = href
        }
      }
      
      // Remove existing event listeners and add fallback
      htmlLink.addEventListener('click', fallbackHandler, true)
    })
  }

  // Add fallback to existing links
  addFallbackToLinks()
  
  // Watch for new links being added to the DOM
  const observer = new MutationObserver(() => {
    addFallbackToLinks()
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  console.warn('Fallback navigation enabled - all links will use full page refresh')
}

/**
 * Hook to create router-safe navigation functions
 */
export function useSafeNavigation() {
  const router = useRouter()

  const safeNavigate = (href: string) => {
    try {
      router.push(href)
    } catch (error) {
      console.warn('Router navigation failed, using fallback:', error)
      window.location.href = href
    }
  }

  const safeReplace = (href: string) => {
    try {
      router.replace(href)
    } catch (error) {
      console.warn('Router replace failed, using fallback:', error)
      window.location.replace(href)
    }
  }

  const safeBack = () => {
    try {
      router.back()
    } catch (error) {
      console.warn('Router back failed, using fallback:', error)
      window.history.back()
    }
  }

  return {
    navigate: safeNavigate,
    replace: safeReplace,
    back: safeBack
  }
}