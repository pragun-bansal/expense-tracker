'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface VirtualScrollListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
}

export function VirtualScrollList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const containerHeight = items.length * itemHeight
  
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(height / itemHeight),
      items.length - 1
    )

    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(items.length - 1, visibleEnd + overscan)
    }
  }, [scrollTop, itemHeight, height, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1)
  }, [items, visibleRange])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: containerHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleRange.start * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simpler auto-height virtual list
export function AutoVirtualList<T>({
  items,
  maxHeight = 400,
  estimatedItemHeight = 60,
  renderItem,
  className = ''
}: {
  items: T[]
  maxHeight?: number
  estimatedItemHeight?: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}) {
  const [visibleCount, setVisibleCount] = useState(10)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const count = Math.ceil(maxHeight / estimatedItemHeight) + 5
    setVisibleCount(count)
  }, [maxHeight, estimatedItemHeight])

  const visibleItems = items.slice(0, visibleCount)

  const loadMore = () => {
    if (visibleCount < items.length) {
      setVisibleCount(prev => Math.min(prev + 10, items.length))
    }
  }

  return (
    <div ref={containerRef} className={className}>
      <div className="space-y-2">
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>
      
      {visibleCount < items.length && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More ({items.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}