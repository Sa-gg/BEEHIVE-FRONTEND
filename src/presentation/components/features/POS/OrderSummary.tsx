import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../common/ui/select'
import { OrderItemRow } from './OrderItemRow'
import { ShoppingCart, User, Hash, CreditCard, UtensilsCrossed, Package, Bike } from 'lucide-react'
import { Badge } from '../../common/ui/badge'

interface OrderSummaryProps {
  items: OrderItem[]
  customerName: string
  tableNumber: string
  paymentMethod: string
  orderType: string
  onCustomerNameChange: (value: string) => void
  onTableNumberChange: (value: string) => void
  onPaymentMethodChange: (value: string) => void
  onOrderTypeChange: (value: string) => void
  onUpdateQuantity: (menuItemId: string, quantity: number) => void
  onRemove: (menuItemId: string) => void
  onClearOrder: () => void
  onConfirmOrder: () => void
}

export const OrderSummary = ({
  items,
  customerName,
  tableNumber,
  paymentMethod,
  orderType,
  onCustomerNameChange,
  onTableNumberChange,
  onPaymentMethodChange,
  onOrderTypeChange,
  onUpdateQuantity,
  onRemove,
  onClearOrder,
  onConfirmOrder,
}: OrderSummaryProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = subtotal * 0.12 // 12% VAT
  const total = subtotal + tax

  const getOrderTypeIcon = () => {
    switch (orderType) {
      case 'DINE_IN': return <UtensilsCrossed className="h-3 w-3" />
      case 'TAKEOUT': return <Package className="h-3 w-3" />
      case 'DELIVERY': return <Bike className="h-3 w-3" />
      default: return <UtensilsCrossed className="h-3 w-3" />
    }
  }

  const getOrderTypeColor = () => {
    switch (orderType) {
      case 'DINE_IN': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'TAKEOUT': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'DELIVERY': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Clean Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Current Order</h2>
          <span className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </div>
      </div>

      {/* Order Type Pills */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => onOrderTypeChange('DINE_IN')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
              orderType === 'DINE_IN'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dine In
          </button>
          <button
            onClick={() => onOrderTypeChange('TAKEOUT')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
              orderType === 'TAKEOUT'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Take Away
          </button>
          <button
            onClick={() => onOrderTypeChange('DELIVERY')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
              orderType === 'DELIVERY'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Delivery
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="px-4 py-2 border-b border-gray-100 shrink-0 space-y-2">
        {/* Customer Name & Table in one row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="h-9 rounded-full border-gray-200 bg-gray-50 text-xs focus-visible:ring-1 focus-visible:ring-gray-900"
            />
          </div>

          {/* Table Number - only for Dine In */}
          {orderType === 'DINE_IN' && (
            <div className="col-span-1">
              <Input
                placeholder="Table"
                value={tableNumber}
                onChange={(e) => onTableNumberChange(e.target.value)}
                className="h-9 rounded-full border-gray-200 bg-gray-50 text-xs focus-visible:ring-1 focus-visible:ring-gray-900"
              />
            </div>
          )}

          {/* Payment Method */}
          <div className={orderType === 'DINE_IN' ? 'col-span-1' : 'col-span-2'}>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="h-9 rounded-full border-gray-200 bg-gray-50 text-xs">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="GCASH">GCash</SelectItem>
                <SelectItem value="PAYMAYA">PayMaya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <ShoppingCart className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No items yet</p>
            <p className="text-xs text-gray-500 mt-1">Add items from menu</p>
          </div>
        ) : (
          <div className="space-y-2">
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
        <div className="border-t border-gray-100 px-4 py-4 shrink-0 space-y-4">
          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tax (12%)</span>
              <span className="font-medium text-gray-900">₱{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearOrder}
              className="flex-1 h-11 rounded-full border-gray-300 hover:bg-gray-100 text-sm font-medium"
            >
              Clear
            </Button>
            <Button
              onClick={onConfirmOrder}
              className="flex-[2] h-11 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium shadow-sm"
            >
              Confirm Order
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
