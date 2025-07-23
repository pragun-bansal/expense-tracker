'use client'

import { useToast, Toast } from '@/contexts/ToastContext'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500 bg-card shadow-lg'
      case 'error':
        return 'border-l-red-500 bg-card shadow-lg'
      case 'warning':
        return 'border-l-yellow-500 bg-card shadow-lg'
      case 'info':
      default:
        return 'border-l-blue-500 bg-card shadow-lg'
    }
  }

  return (
    <div
      className={`
        max-w-md w-full rounded-lg pointer-events-auto border-l-4 border-r border-t border-b
        ${getColorClasses()}
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="p-5">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-heading mb-1">
              {toast.title}
            </h4>
            <p className="text-sm text-body leading-relaxed">
              {toast.message}
            </p>
            {toast.action && (
              <div className="mt-4">
                <button
                  onClick={toast.action.onClick}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleRemove}
              className="inline-flex items-center justify-center w-8 h-8 text-muted hover:text-body hover:bg-button-secondary-hover rounded-full transition-colors focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}