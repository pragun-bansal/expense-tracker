'use client'

import { useState, useEffect, ReactNode } from 'react'

interface LazyTabContentProps {
  isActive: boolean
  children: ReactNode
  fallback?: ReactNode
}

export function LazyTabContent({ isActive, children, fallback }: LazyTabContentProps) {
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (isActive && !hasLoaded) {
      // Small delay to ensure smooth tab transition
      const timer = setTimeout(() => {
        setHasLoaded(true)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isActive, hasLoaded])

  if (!isActive) {
    return null
  }

  if (!hasLoaded) {
    return fallback || (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}