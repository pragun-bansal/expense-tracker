'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'muted'
}

export default function LoadingSpinner({ 
  size = 'md', 
  text, 
  className = '',
  variant = 'default'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
    xl: 'text-base'
  }

  const variantClasses = {
    default: 'text-icon-neutral',
    primary: 'text-button-primary',
    success: 'text-status-success',
    muted: 'text-muted'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin ${variantClasses[variant]} ${sizeClasses[size]}`} />
      {text && (
        <span className={`ml-2 ${textSizeClasses[size]} text-body`}>
          {text}
        </span>
      )}
    </div>
  )
}

export function LoadingOverlay({ 
  text = 'Loading...', 
  variant = 'default' 
}: { 
  text?: string
  variant?: 'default' | 'primary' | 'success' | 'muted'
}) {
  return (
    <div className="fixed inset-0 bg-modal-overlay flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 shadow-card border border-card-border">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" variant={variant} />
          <div className="text-center">
            <p className="text-heading font-medium">{text}</p>
            <div className="mt-2 flex space-x-1">
              <div className="w-2 h-2 bg-button-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-button-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-button-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoadingButton({ 
  loading, 
  children, 
  size = 'md',
  variant = 'primary',
  ...props 
}: {
  loading: boolean
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const variantClasses = {
    primary: 'bg-button-primary text-button-primary hover:bg-button-primary-hover',
    secondary: 'bg-button-secondary text-button-secondary hover:bg-button-secondary-hover border border-input',
    success: 'bg-button-success text-button-success hover:bg-button-success-hover',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  }

  const spinnerSize = size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'sm'

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${props.className || ''}`}
    >
      {loading ? (
        <>
          <LoadingSpinner size={spinnerSize} className="mr-2" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  )
}