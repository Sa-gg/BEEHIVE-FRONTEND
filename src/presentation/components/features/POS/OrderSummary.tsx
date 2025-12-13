import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { OrderItemRow } from './OrderItemRow'
import { ShoppingCart } from 'lucide-react'

interface OrderSummaryProps {
  items: OrderItem[]
  onUpdateQuantity: (menuItemId: string, quantity: number) => void
  onRemove: (menuItemId: string) => void
  onClearOrder: () => void
  onConfirmOrder: () => void
}

export const OrderSummary = ({
  items,
  onUpdateQuantity,
  onRemove,
  onClearOrder,
  onConfirmOrder,
}: OrderSummaryProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.12 // 12% VAT
  const total = subtotal + tax

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-3 lg:p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
          <h2 className="text-lg lg:text-xl font-bold">Current Order</h2>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="h-12 w-12 lg:h-16 lg:w-16 mb-3 lg:mb-4" />
            <p className="text-xs lg:text-sm">No items in order</p>
            <p className="text-[10px] lg:text-xs">Add items from the menu</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <OrderItemRow
                key={item.menuItemId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Section */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 p-3 lg:p-4 space-y-3 lg:space-y-4 flex-shrink-0">
          {/* Totals */}
          <div className="space-y-1.5 lg:space-y-2">
            <div className="flex justify-between text-xs lg:text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs lg:text-sm">
              <span className="text-gray-600">Tax (12%)</span>
              <span className="font-medium">₱{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base lg:text-lg font-bold border-t pt-1.5 lg:pt-2">
              <span>Total</span>
              <span className="text-blue-600">₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full text-sm lg:text-base"
              size="lg"
              onClick={onConfirmOrder}
            >
              Confirm Order
            </Button>
            <Button
              className="w-full text-sm lg:text-base"
              variant="outline"
              onClick={onClearOrder}
            >
              Clear Order
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
