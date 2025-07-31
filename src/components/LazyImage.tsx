'use client'

import { useState, useRef, useEffect } from 'react'
import { useLazyLoad } from '@/hooks/useProgressiveLoading'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  fallback?: React.ReactNode
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  fallback
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { targetRef, isVisible } = useLazyLoad()

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
  }

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div ref={targetRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
          )}
        </div>
      )}
      
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  )
}

// Lazy loading component for receipt thumbnails
export function LazyReceiptImage({ 
  receiptUrl, 
  alt = "Receipt",
  className = "w-8 h-8 rounded object-cover"
}: {
  receiptUrl?: string
  alt?: string
  className?: string
}) {
  if (!receiptUrl) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-xs text-gray-400">📄</span>
      </div>
    )
  }

  return (
    <LazyImage
      src={receiptUrl}
      alt={alt}
      className={className}
      placeholder="📄"
      fallback={
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <span className="text-xs text-gray-400">❌</span>
        </div>
      }
    />
  )
}