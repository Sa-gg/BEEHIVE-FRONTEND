import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { ShieldCheck, X, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../../infrastructure/api/auth.api'

interface ManagerPinModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthorized: (managerId: string, managerName: string) => void
  title: string
  description?: string
  actionLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

export const ManagerPinModal = ({
  isOpen,
  onClose,
  onAuthorized,
  title,
  description,
  actionLabel = 'Authorize',
  variant = 'default'
}: ManagerPinModalProps) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPin('')
      setError('')
      setIsLoading(false)
      setShowPin(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pin || pin.length < 4) {
      setError('Please enter a valid PIN (minimum 4 digits)')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Validate manager PIN against backend
      const response = await authApi.validateManagerPin(pin)
      
      if (response.valid && response.manager) {
        onAuthorized(response.manager.id, response.manager.name)
        onClose()
      } else {
        setError('Invalid manager PIN. Access denied.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid manager PIN')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setPin(value)
    setError('')
  }

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      headerBg: 'bg-red-50',
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      iconBg: 'bg-red-100',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      headerBg: 'bg-amber-50',
      icon: <ShieldCheck className="h-6 w-6 text-amber-600" />,
      iconBg: 'bg-amber-100',
      buttonClass: 'bg-amber-500 hover:bg-amber-600 text-black'
    },
    default: {
      headerBg: 'bg-blue-50',
      icon: <ShieldCheck className="h-6 w-6 text-blue-600" />,
      iconBg: 'bg-blue-100',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const styles = variantStyles[variant]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className={`${styles.headerBg} p-6 border-b`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`${styles.iconBg} p-2 rounded-full`}>
                  {styles.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {description && (
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  This action requires manager authorization.
                  <br />
                  Please enter your manager PIN to continue.
                </p>
              </div>

              {/* PIN Input */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="Enter Manager PIN"
                  maxLength={8}
                  className={`w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`flex-1 ${styles.buttonClass}`}
                disabled={isLoading || !pin}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {actionLabel}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
