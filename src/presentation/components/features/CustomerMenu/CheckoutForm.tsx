import { useState, useEffect } from 'react'
import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { ArrowLeft, ShoppingBag, User, MapPin, CreditCard, MessageSquare, Utensils, Package, Truck, Banknote, Smartphone, CreditCard as CardIcon } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'

interface CheckoutFormProps {
  items: OrderItem[]
  onSubmit: (data: { customerName: string; tableNumber: string; notes: string; orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'; paymentMethod: string }) => void
  onBack: () => void
  isSubmitting?: boolean
}

export const CheckoutForm = ({ items, onSubmit, onBack, isSubmitting = false }: CheckoutFormProps) => {
  const { user, isAuthenticated } = useAuthStore()
  const [customerName, setCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT' | 'DELIVERY'>('DINE_IN')
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')

  // Pre-fill customer name if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.name) {
      setCustomerName(user.name)
    }
  }, [isAuthenticated, user])

  // VAT is inclusive (already included in the displayed prices)
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = total * (12 / 112) // Extract 12% VAT from inclusive price
  const subtotal = total - tax

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ customerName, tableNumber, notes, orderType, paymentMethod })
  }

  const orderTypeOptions = [
    { value: 'DINE_IN', label: 'Dine In', icon: Utensils, description: 'Eat here' },
    { value: 'TAKEOUT', label: 'Takeout', icon: Package, description: 'Pick up' },
    { value: 'DELIVERY', label: 'Delivery', icon: Truck, description: 'We deliver' },
  ]

  const paymentOptions = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'GCASH', label: 'GCash', icon: Smartphone },
    { value: 'CARD', label: 'Card', icon: CardIcon },
    { value: 'MAYA', label: 'Maya', icon: Smartphone },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-28">
      {/* Floating Bee Icon */}
      <div className="fixed top-4 right-4 z-40">
        <div className="w-10 h-10 rounded-full bg-white shadow-md border-2 border-amber-300 flex items-center justify-center">
          <span className="text-xl">🐝</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Checkout</h1>
              <p className="text-xs text-gray-500">{items.length} item{items.length > 1 ? 's' : ''} in your order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Order Summary - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            Your Order
          </h2>
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between items-center py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.quantity}
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-medium">₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT (12%)</span>
              <span>₱{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-amber-200">
              <span>Total</span>
              <span className="text-amber-600">₱{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer Information Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order Type Selection - Visual Cards */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-500" />
              How would you like your order?
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {orderTypeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = orderType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOrderType(option.value as any)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      isSelected 
                        ? 'border-amber-400 bg-amber-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-amber-700' : 'text-gray-600'}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Personal Details */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              Your Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </h2>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="customerName" className="text-sm text-gray-600 mb-1.5 block">Name</Label>
                <Input
                  id="customerName"
                  placeholder="What should we call you?"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>

              <div>
                <Label htmlFor="tableNumber" className="text-sm text-gray-600 mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Table Number
                </Label>
                <Input
                  id="tableNumber"
                  placeholder="e.g., 5"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Payment Method
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {paymentOptions.map((option) => {
                const Icon = option.icon
                const isSelected = paymentMethod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                      isSelected 
                        ? 'border-amber-400 bg-amber-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-amber-700' : 'text-gray-600'}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Label htmlFor="notes" className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Special Instructions <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </Label>
            <textarea
              id="notes"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent min-h-[80px] resize-none text-sm"
              placeholder="Any allergies or special requests?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Fixed Bottom Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold rounded-xl transition-all"
              disabled={isSubmitting}
              style={{ backgroundColor: isSubmitting ? '#D1D5DB' : '#F9C900', color: '#000000' }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🐝</span>
                  Placing Order...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Place Order • ₱{total.toFixed(2)}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
