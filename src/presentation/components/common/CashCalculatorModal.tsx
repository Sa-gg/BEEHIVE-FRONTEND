import { useState, useEffect, useRef, useCallback } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens and auto-focus
  useEffect(() => {
    if (isOpen) {
      setCashInput('')
      setChangeAmount(0)
      // Auto-focus the input after a small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
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

  const handleConfirm = useCallback(() => {
    const cash = parseFloat(cashInput) || 0
    if (cash < totalAmount) {
      alert('Cash received is less than the total amount')
      return
    }
    onConfirm(cash, changeAmount)
  }, [cashInput, totalAmount, changeAmount, onConfirm])

  // Handle keyboard events - Enter to confirm, Escape to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const cash = parseFloat(cashInput) || 0
        if (cash >= totalAmount) {
          handleConfirm()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, cashInput, totalAmount, handleConfirm, onClose])

  // Handle direct keyboard input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers and one decimal point
    if (/^[0-9]*\.?[0-9]{0,2}$/.test(value) || value === '') {
      setCashInput(value)
    }
  }

  const cashReceived = parseFloat(cashInput) || 0
  const isValid = cashReceived >= totalAmount

  // Quick amount suggestions based on total
  const getQuickAmounts = () => {
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
        <div className="bg-[#F9C900] text-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors"
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
          
          {/* Cash Input Display - Now an actual input field */}
          <div className="bg-white rounded-xl border-2 border-[#F9C900]/50 p-4 focus-within:border-[#F9C900] focus-within:ring-2 focus-within:ring-[#F9C900]/20 transition-all">
            <label htmlFor="cashInput" className="text-sm text-gray-500 block mb-1">Cash Received</label>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-gray-900 mr-1">₱</span>
              <input
                ref={inputRef}
                id="cashInput"
                type="text"
                inputMode="decimal"
                value={cashInput}
                onChange={handleInputChange}
                placeholder="0.00"
                className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none w-full min-h-[40px] placeholder:text-gray-300"
                autoComplete="off"
              />
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
              className="flex-1 min-w-[80px] border-[#F9C900] text-gray-900 hover:bg-[#F9C900]/10 font-medium"
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
                  ? 'bg-[#F9C900]/20 text-gray-800 hover:bg-[#F9C900]/30' 
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
            className={`flex-1 ${isValid ? 'bg-[#F9C900] hover:bg-[#E5B800] text-black' : ''}`}
          >
            Confirm Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
