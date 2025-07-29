'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}: ConfirmModalProps) {
  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'
      default:
        return 'bg-button-primary text-button-primary hover:bg-button-primary-hover disabled:opacity-50'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <p className="text-sm text-body mb-6">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-input-label border border-input rounded-md hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:cursor-not-allowed ${getConfirmButtonColor()}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}