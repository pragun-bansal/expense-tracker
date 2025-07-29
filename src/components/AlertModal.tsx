'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import Modal from './Modal'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
}

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  confirmText = 'OK' 
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-status-success" />
      case 'error':
        return <XCircle className="h-6 w-6 text-status-error" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-status-warning" />
      default:
        return <Info className="h-6 w-6 text-status-info" />
    }
  }

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-button-success text-button-success hover:bg-button-success-hover'
      case 'error':
        return 'bg-red-600 text-white hover:bg-red-700'
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700'
      default:
        return 'bg-button-primary text-button-primary hover:bg-button-primary-hover'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          {getIcon()}
        </div>
        <p className="text-sm text-body mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className={`w-full px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 ${getButtonColor()}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}