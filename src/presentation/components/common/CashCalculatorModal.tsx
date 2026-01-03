import { useState, useEffect } from 'react'
import { X, Calculator, Check, Delete } from 'lucide-react'
import { Button } from './ui/button'

interface CashCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (cashReceived: number, changeAmount: number) => void
  totalAmount: number
  title?: string
}

export const CashCalculatorModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  title = 'Payment'
}: CashCalculatorModalProps) => {
  const [cashInput, setCashInput] = useState('')
  const [changeAmount, setChangeAmount] = useState(0)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashInput('')
      setChangeAmount(0)
    }
  }, [isOpen])

  // Calculate change whenever cash input changes
  useEffect(() => {
    const cash = parseFloat(cashInput) || 0
    const change = cash - totalAmount
    setChangeAmount(change >= 0 ? change : 0)
  }, [cashInput, totalAmount])

  const handleNumberClick = (num: string) => {
    if (num === '.' && cashInput.includes('.')) return
    if (num === '.' && cashInput === '') {
      setCashInput('0.')
      return
    }
    // Limit decimal places to 2
    if (cashInput.includes('.')) {
      const parts = cashInput.split('.')
      if (parts[1].length >= 2) return
    }
    setCashInput(prev => prev + num)
  }

  const handleBackspace = () => {
    setCashInput(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setCashInput('')
  }

  const handleQuickAmount = (amount: number) => {
    setCashInput(amount.toString())
  }

  const handleExactAmount = () => {
    setCashInput(totalAmount.toFixed(2))
  }

  const handleConfirm = () => {
    const cash = parseFloat(cashInput) || 0
    if (cash < totalAmount) {
      alert('Cash received is less than the total amount')
      return
    }
    onConfirm(cash, changeAmount)
  }

  const cashReceived = parseFloat(cashInput) || 0
  const isValid = cashReceived >= totalAmount

  // Quick amount suggestions based on total
  const getQuickAmounts = () => {
    const roundedTotal = Math.ceil(totalAmount)
    const suggestions = [
      Math.ceil(totalAmount / 50) * 50,
      Math.ceil(totalAmount / 100) * 100,
      Math.ceil(totalAmount / 500) * 500,
      Math.ceil(totalAmount / 1000) * 1000,
    ].filter((amount, index, arr) => 
      amount >= totalAmount && arr.indexOf(amount) === index
    ).slice(0, 4)
    
    // Add common denominations if not already present
    const common = [20, 50, 100, 200, 500, 1000]
    common.forEach(amount => {
      if (amount >= totalAmount && !suggestions.includes(amount) && suggestions.length < 6) {
        suggestions.push(amount)
      }
    })
    
    return suggestions.sort((a, b) => a - b).slice(0, 6)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6" />
            <h2 className="text-xl font-bold">{title}</h2>
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
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 font-medium">Total Amount:</span>
            <span className="text-2xl font-bold text-gray-900">₱{totalAmount.toFixed(2)}</span>
          </div>
          
          {/* Cash Input Display */}
          <div className="bg-white rounded-xl border-2 border-amber-200 p-4">
            <label className="text-sm text-gray-500 block mb-1">Cash Received</label>
            <div className="text-3xl font-bold text-amber-600 min-h-[40px]">
              ₱{cashInput || '0.00'}
            </div>
          </div>

          {/* Change Display */}
          <div className={`mt-3 p-3 rounded-xl ${isValid ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${isValid ? 'text-green-700' : 'text-gray-500'}`}>Change:</span>
              <span className={`text-2xl font-bold ${isValid ? 'text-green-600' : 'text-gray-400'}`}>
                ₱{changeAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="px-6 py-3 border-b bg-white">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExactAmount}
              className="flex-1 min-w-[80px] border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              Exact
            </Button>
            {getQuickAmounts().map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="flex-1 min-w-[60px] border-gray-300 hover:bg-gray-50"
              >
                ₱{amount}
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
              className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
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
              className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                key === '←' 
                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {key === '←' ? <Delete className="h-6 w-6 mx-auto" /> : key}
            </button>
          ))}
          {['1', '2', '3'].map(key => (
            <button
              key={key}
              onClick={() => handleNumberClick(key)}
              className="h-14 rounded-xl text-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95"
            >
              {key}
            </button>
          ))}
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 row-span-2 flex items-center justify-center ${
              isValid 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Check className="h-8 w-8" />
          </button>
          {['0', '00', '.'].map(key => (
            <button
              key={key}
              onClick={() => handleNumberClick(key === '00' ? '00' : key)}
              className="h-14 rounded-xl text-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-1 ${isValid ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            Confirm Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
