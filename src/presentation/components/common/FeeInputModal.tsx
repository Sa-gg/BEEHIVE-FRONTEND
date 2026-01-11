import { useState, useEffect } from 'react'
import { X, Delete, Percent, Truck, BadgePercent, HandCoins } from 'lucide-react'
import { Button } from './ui/button'

export type FeeType = 'delivery' | 'service' | 'discount'

interface FeeInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  feeType: FeeType
  currentAmount: number
  subtotal?: number // For calculating percentage-based discounts
}

const feeConfig = {
  delivery: {
    title: 'Delivery Fee',
    icon: Truck,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600'
  },
  service: {
    title: 'Service Fee',
    icon: HandCoins,
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600'
  },
  discount: {
    title: 'Discount',
    icon: BadgePercent,
    color: 'green',
    gradient: 'from-green-500 to-green-600'
  }
}

export const FeeInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  feeType,
  currentAmount,
  subtotal = 0
}: FeeInputModalProps) => {
  const [input, setInput] = useState('')
  const [isPercentage, setIsPercentage] = useState(false)

  const config = feeConfig[feeType]
  const Icon = config.icon

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInput(currentAmount > 0 ? currentAmount.toString() : '')
      setIsPercentage(false)
    }
  }, [isOpen, currentAmount])

  const handleNumberClick = (num: string) => {
    if (num === '.' && input.includes('.')) return
    if (num === '.' && input === '') {
      setInput('0.')
      return
    }
    // Limit decimal places to 2
    if (input.includes('.')) {
      const parts = input.split('.')
      if (parts[1].length >= 2) return
    }
    setInput(prev => prev + num)
  }

  const handleBackspace = () => {
    setInput(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setInput('')
  }

  const handleConfirm = () => {
    let finalAmount = parseFloat(input) || 0
    
    if (isPercentage && feeType === 'discount') {
      // Convert percentage to actual amount
      finalAmount = (subtotal * finalAmount) / 100
    }
    
    onConfirm(finalAmount)
  }

  const handleRemove = () => {
    onConfirm(0)
  }

  const currentValue = parseFloat(input) || 0
  const displayAmount = isPercentage && feeType === 'discount' 
    ? (subtotal * currentValue) / 100 
    : currentValue

  // Common discount percentages
  const discountPresets = [5, 10, 15, 20, 25, 50]
  // Common fee amounts
  const feePresets = [20, 30, 50, 80, 100, 150]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.gradient} text-white px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6" />
            <h2 className="text-xl font-bold">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          {/* Percentage Toggle for Discount */}
          {feeType === 'discount' && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsPercentage(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  !isPercentage 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                ₱ Amount
              </button>
              <button
                onClick={() => setIsPercentage(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isPercentage 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <Percent className="h-4 w-4" />
                Percentage
              </button>
            </div>
          )}
          
          {/* Input Display */}
          <div className={`bg-white rounded-xl border-2 p-4 ${
            feeType === 'discount' ? 'border-green-200' : 
            feeType === 'delivery' ? 'border-blue-200' : 'border-purple-200'
          }`}>
            <label className="text-sm text-gray-500 block mb-1">
              {isPercentage ? 'Discount Percentage' : config.title}
            </label>
            <div className={`text-3xl font-bold min-h-[40px] ${
              feeType === 'discount' ? 'text-green-600' : 
              feeType === 'delivery' ? 'text-blue-600' : 'text-purple-600'
            }`}>
              {isPercentage ? `${input || '0'}%` : `₱${input || '0.00'}`}
            </div>
          </div>

          {/* Show calculated amount if percentage */}
          {isPercentage && feeType === 'discount' && (
            <div className="mt-2 text-sm text-gray-500">
              = ₱{displayAmount.toFixed(2)} discount on ₱{subtotal.toFixed(2)}
            </div>
          )}
        </div>

        {/* Preset Buttons */}
        <div className="px-6 py-3 border-b bg-white">
          <div className="flex flex-wrap gap-2">
            {(feeType === 'discount' && isPercentage ? discountPresets : feePresets).map(preset => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setInput(preset.toString())}
                className="flex-1 min-w-[50px]"
              >
                {isPercentage ? `${preset}%` : `₱${preset}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Calculator Keypad */}
        <div className="p-4 grid grid-cols-4 gap-2">
          {['7', '8', '9', 'C'].map(key => (
            <button
              key={key}
              onClick={() => key === 'C' ? handleClear() : handleNumberClick(key)}
              className={`h-12 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                key === 'C' 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {key}
            </button>
          ))}
          {['4', '5', '6', '←'].map(key => (
            <button
              key={key}
              onClick={() => key === '←' ? handleBackspace() : handleNumberClick(key)}
              className={`h-12 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                key === '←' 
                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {key === '←' ? <Delete className="h-5 w-5 mx-auto" /> : key}
            </button>
          ))}
          {['1', '2', '3', '0'].map(key => (
            <button
              key={key}
              onClick={() => handleNumberClick(key)}
              className="h-12 rounded-xl text-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95"
            >
              {key}
            </button>
          ))}
          {['00', '.'].map(key => (
            <button
              key={key}
              onClick={() => handleNumberClick(key === '00' ? '00' : key)}
              className="h-12 rounded-xl text-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95"
            >
              {key}
            </button>
          ))}
          <button
            onClick={handleConfirm}
            className={`h-12 rounded-xl text-base font-semibold transition-all active:scale-95 col-span-2 ${
              feeType === 'discount' ? 'bg-green-500 text-white hover:bg-green-600' : 
              feeType === 'delivery' ? 'bg-blue-500 text-white hover:bg-blue-600' : 
              'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            Apply
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          {currentAmount > 0 && (
            <Button
              variant="outline"
              onClick={handleRemove}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={`flex-1 ${
              feeType === 'discount' ? 'bg-green-500 hover:bg-green-600' : 
              feeType === 'delivery' ? 'bg-blue-500 hover:bg-blue-600' : 
              'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            Apply {config.title}
          </Button>
        </div>
      </div>
    </div>
  )
}
