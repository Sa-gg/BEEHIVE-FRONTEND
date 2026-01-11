import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Minus, Plus, ShoppingBag, X, ArrowRight } from 'lucide-react'

interface CartDrawerProps {
  items: OrderItem[]
  onUpdateQuantity: (menuItemId: string, quantity: number) => void
  onRemove: (menuItemId: string) => void
  onClearAll: () => void
  onCheckout: () => void
  isOpen: boolean
  onClose: () => void
}

export const CartDrawer = ({
  items,
  onUpdateQuantity,
  onRemove,
  onClearAll,
  onCheckout,
  isOpen,
  onClose,
}: CartDrawerProps) => {
  // Total is the sum of item prices (VAT is already included in displayed prices)
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)
  // VAT is inclusive - extract 12% from the total (12/112)
  const vat = total * (12 / 112)
  // Subtotal is total minus VAT
  const subtotal = total - vat

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-80 transition-opacity backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-90 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Your Cart</h2>
                <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto px-4 py-3 flex-1 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-10 w-10 text-amber-300" />
              </div>
              <p className="text-gray-500 font-medium mb-1">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add some delicious items!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.menuItemId} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">{item.name}</h4>
                      <p className="text-xs text-gray-500">₱{item.price.toFixed(2)} each</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.menuItemId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white rounded-full border border-gray-200 p-0.5">
                      <button
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                        onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                      <button
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-amber-100 transition-colors bg-amber-50"
                        onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-600" />
                      </button>
                    </div>
                    <span className="font-bold text-amber-600">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Totals and Checkout */}
        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-100 bg-white shrink-0 space-y-3">
            {/* Clear All Button */}
            <button
              onClick={() => {
                if (confirm('Remove all items from cart?')) {
                  onClearAll()
                }
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-red-500 transition-colors py-1"
            >
              Clear all items
            </button>
            
            {/* Totals */}
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-700">₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (12%)</span>
                <span className="text-gray-700">₱{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-amber-200">
                <span className="text-gray-800">Total</span>
                <span className="text-amber-600">₱{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Checkout Button */}
            <Button
              className="w-full h-14 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg"
              onClick={onCheckout}
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              Proceed to Checkout
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
