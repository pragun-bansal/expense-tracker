'use client'

import { useState, useCallback } from 'react'

interface AlertOptions {
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function useModal() {
  const [alertModal, setAlertModal] = useState<(AlertOptions & { isOpen: boolean }) | null>(null)
  const [confirmModal, setConfirmModal] = useState<(ConfirmOptions & { 
    isOpen: boolean
    onConfirm: () => void
    loading: boolean
  }) | null>(null)

  // Provide stable default values for alertModal to prevent null reference errors
  const safeAlertModal = alertModal || {
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as const
  }

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertModal({
      ...options,
      isOpen: true
    })
  }, [])

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        ...options,
        isOpen: true,
        loading: false,
        onConfirm: () => {
          setConfirmModal(prev => prev ? { ...prev, loading: true } : null)
          resolve(true)
        }
      })
    })
  }, [])

  const closeAlert = useCallback(() => {
    setAlertModal(null)
  }, [])

  const closeConfirm = useCallback(() => {
    setConfirmModal(null)
  }, [])

  return {
    alertModal: safeAlertModal,
    confirmModal,
    showAlert,
    showConfirm,
    closeAlert,
    closeConfirm
  }
}