import { useEffect, useCallback } from 'react'
import { X, AlertTriangle, Info, AlertOctagon, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'

export type ConfirmationModalType = 'warning' | 'danger' | 'info' | 'success'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | string[]
  confirmText?: string
  cancelText?: string
  type?: ConfirmationModalType
  confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    defaultButtonVariant: 'default' as const,
  },
  danger: {
    icon: AlertOctagon,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    defaultButtonVariant: 'destructive' as const,
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    defaultButtonVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    defaultButtonVariant: 'default' as const,
  },
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  confirmButtonVariant,
}: ConfirmationModalProps) => {
  const config = typeConfig[type]
  const IconComponent = config.icon
  const buttonVariant = confirmButtonVariant || config.defaultButtonVariant

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
    }
  }, [onClose, onConfirm])

  useEffect(() => {
    if (!isOpen) return
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const messages = Array.isArray(message) ? message : [message]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${config.borderColor} ${config.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {messages.length === 1 ? (
            <p className="text-gray-600">{messages[0]}</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, idx) => (
                <p key={idx} className="text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{msg}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-w-[100px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            className="min-w-[100px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
