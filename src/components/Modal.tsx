'use client'

import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  showCloseButton?: boolean
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }

  return (
    <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${sizeClasses[size]} border shadow-lg rounded-md bg-card p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-heading">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-icon-neutral hover:text-icon-neutral-hover hover:bg-button-secondary-hover rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mt-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}