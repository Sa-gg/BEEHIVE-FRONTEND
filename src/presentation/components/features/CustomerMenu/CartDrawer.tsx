import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'

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
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.12
  const total = subtotal + tax

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-80 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-90 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" style={{ color: '#F9C900' }} />
              <h2 className="text-xl font-bold">Your Order</h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-gray-500">{items.length} items</span>
              {items.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all items from cart?')) {
                      onClearAll()
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ShoppingBag className="h-16 w-16 mb-4" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.menuItemId} className={`flex gap-3 pb-4 ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">₱{item.price.toFixed(2)} each</p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemove(item.menuItemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-sm">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Totals and Checkout */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (12%)</span>
                <span className="font-medium">₱{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span style={{ color: '#F9C900' }}>₱{total.toFixed(2)}</span>
              </div>
            </div>
            
            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
