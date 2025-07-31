'use client'

import { useEffect, useRef } from 'react'

interface PrefetchOptions {
  enabled?: boolean
  delay?: number
}

export function useDataPrefetch(
  prefetchFunction: () => Promise<void>,
  dependencies: any[] = [],
  options: PrefetchOptions = {}
) {
  const { enabled = true, delay = 2000 } = options
  const hasPrefetched = useRef(false)

  useEffect(() => {
    if (!enabled || hasPrefetched.current) return

    const timer = setTimeout(() => {
      prefetchFunction()
        .catch(error => {
          console.warn('Prefetch failed:', error)
        })
      hasPrefetched.current = true
    }, delay)

    return () => clearTimeout(timer)
  }, [...dependencies, enabled, delay])
}

// Hook for prefetching page data when user hovers over navigation
export function useHoverPrefetch(
  url: string,
  prefetchFunction: () => Promise<void>
) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const hasPrefetched = useRef(false)

  const handleMouseEnter = () => {
    if (hasPrefetched.current) return

    timeoutRef.current = setTimeout(() => {
      prefetchFunction()
        .catch(error => {
          console.warn(`Prefetch failed for ${url}:`, error)
        })
      hasPrefetched.current = true
    }, 300) // Short delay to avoid unnecessary requests
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  }
}

// Hook for caching API responses
export function useApiCache<T>(key: string) {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map())
  const cacheTimeout = 5 * 60 * 1000 // 5 minutes

  const get = (cacheKey: string): T | null => {
    const cached = cache.current.get(cacheKey)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cacheTimeout
    if (isExpired) {
      cache.current.delete(cacheKey)
      return null
    }

    return cached.data
  }

  const set = (cacheKey: string, data: T) => {
    cache.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }

  const clear = () => {
    cache.current.clear()
  }

  return { get, set, clear }
}