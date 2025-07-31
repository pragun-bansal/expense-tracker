'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, MouseEvent } from 'react'

interface SafeLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
  replace?: boolean
}

/**
 * Safe Link component that falls back to full page navigation
 * if Next.js client-side routing fails
 */
export function SafeLink({ 
  href, 
  children, 
  className, 
  onClick,
  replace = false 
}: SafeLinkProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick()
    }

    // Don't interfere with special clicks (ctrl+click, middle click, etc.)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return
    }

    // Prevent default and try client-side navigation first
    e.preventDefault()

    try {
      if (replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    } catch (error) {
      console.warn('Client-side navigation failed, using fallback:', error)
      // Fallback to full page navigation
      if (replace) {
        window.location.replace(href)
      } else {
        window.location.href = href
      }
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

/**
 * Safe navigation button component
 */
export function SafeNavButton({
  href,
  children,
  className,
  onClick
}: {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    }

    try {
      router.push(href)
    } catch (error) {
      console.warn('Button navigation failed, using fallback:', error)
      window.location.href = href
    }
  }

  return (
    <button 
      onClick={handleClick}
      className={className}
      type="button"
    >
      {children}
    </button>
  )
}