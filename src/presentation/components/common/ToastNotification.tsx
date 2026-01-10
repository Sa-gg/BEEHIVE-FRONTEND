import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  navigateTo?: string
  onClick?: () => void
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const ToastItem = ({ toast, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const handleClick = () => {
    if (toast.navigateTo) {
      // Use window.location for navigation to avoid Router context issues
      window.location.href = toast.navigateTo
    }
    if (toast.onClick) {
      toast.onClick()
    }
    onDismiss(toast.id)
  }

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-blue-800',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] ${bgColors[toast.type]}`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${textColors[toast.type]}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-sm mt-1 opacity-80 ${textColors[toast.type]}`}>{toast.message}</p>
        )}
        {toast.navigateTo && (
          <p className="text-xs mt-1 opacity-60 underline">Click to view</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(toast.id)
        }}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4 opacity-50" />
      </button>
    </div>
  )
}

// Toast Container Component
export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { toastDurationSeconds, maxToastNotifications } = useSettingsStore()

  useEffect(() => {
    const handleToast = (event: CustomEvent<Toast>) => {
      const defaultDuration = toastDurationSeconds * 1000 // Convert to milliseconds
      const newToast = {
        ...event.detail,
        id: event.detail.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        duration: event.detail.duration ?? defaultDuration,
      }
      setToasts((prev) => {
        const updated = [...prev, newToast]
        // Limit to maxToastNotifications, remove oldest if exceeding limit
        if (updated.length > maxToastNotifications) {
          return updated.slice(-maxToastNotifications)
        }
        return updated
      })
    }

    window.addEventListener('show-toast', handleToast as EventListener)
    return () => {
      window.removeEventListener('show-toast', handleToast as EventListener)
    }
  }, [toastDurationSeconds, maxToastNotifications])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}

// Helper function to show toast
export const showToast = (options: Omit<Toast, 'id'>) => {
  const event = new CustomEvent('show-toast', {
    detail: options,
  })
  window.dispatchEvent(event)
}

// Preset toast functions
export const toast = {
  success: (title: string, message?: string, navigateTo?: string) =>
    showToast({ type: 'success', title, message, navigateTo }),
  error: (title: string, message?: string) =>
    showToast({ type: 'error', title, message, duration: 8000 }),
  warning: (title: string, message?: string) =>
    showToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    showToast({ type: 'info', title, message }),
  orderCreated: (orderNumber: string, total: string, isPaid?: boolean) =>
    showToast({
      type: 'success',
      title: isPaid ? 'Order Confirmed & Paid!' : 'Order Confirmed & Preparing!',
      message: `Order ${orderNumber} • ₱${total}`,
      navigateTo: '/admin/orders',
      duration: 8000,
    }),
  orderUpdated: (orderNumber: string, isPaid?: boolean) =>
    showToast({
      type: 'success',
      title: isPaid ? 'Order Confirmed, Paid & Preparing!' : 'Order Confirmed & Now Preparing!',
      message: `Order ${orderNumber}`,
      navigateTo: '/admin/orders',
      duration: 8000,
    }),
  linkedOrderCreated: (orderNumber: string, parentOrderNumber: string) =>
    showToast({
      type: 'success',
      title: 'Linked Order Created!',
      message: `Order ${orderNumber} linked to ${parentOrderNumber}`,
      navigateTo: '/admin/orders',
      duration: 8000,
    }),
  itemsAddedToTab: (orderNumber: string, total: string) =>
    showToast({
      type: 'success',
      title: 'Items Added to Tab!',
      message: `Order ${orderNumber} • New Total: ₱${total}`,
      navigateTo: '/admin/orders',
      duration: 8000,
    }),
}
