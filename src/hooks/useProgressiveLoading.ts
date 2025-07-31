'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseProgressiveLoadingOptions {
  initialBatchSize?: number
  batchSize?: number
  delay?: number
}

export function useProgressiveLoading<T>(
  data: T[],
  options: UseProgressiveLoadingOptions = {}
) {
  const {
    initialBatchSize = 10,
    batchSize = 5,
    delay = 100
  } = options

  const [visibleData, setVisibleData] = useState<T[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Reset when data changes
  useEffect(() => {
    if (data.length === 0) {
      setVisibleData([])
      setHasMore(false)
      return
    }

    // Load initial batch
    const initialData = data.slice(0, initialBatchSize)
    setVisibleData(initialData)
    setHasMore(data.length > initialBatchSize)
  }, [data, initialBatchSize])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    
    // Add artificial delay for smoother UX
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const currentLength = visibleData.length
    const nextBatch = data.slice(currentLength, currentLength + batchSize)
    
    setVisibleData(prev => [...prev, ...nextBatch])
    setHasMore(currentLength + batchSize < data.length)
    setIsLoadingMore(false)
  }, [data, visibleData.length, batchSize, hasMore, isLoadingMore, delay])

  return {
    visibleData,
    isLoadingMore,
    hasMore,
    loadMore,
    totalCount: data.length,
    visibleCount: visibleData.length
  }
}

// Hook for intersection observer based loading
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!target) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback()
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px',
      ...options
    })

    observer.observe(target)

    return () => observer.disconnect()
  }, [target, callback, options])

  return setTarget
}

// Hook for lazy loading with visibility
export function useLazyLoad() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const targetRef = useIntersectionObserver(() => {
    if (!hasLoaded) {
      setIsVisible(true)
      setHasLoaded(true)
    }
  })

  return {
    targetRef,
    isVisible,
    hasLoaded
  }
}