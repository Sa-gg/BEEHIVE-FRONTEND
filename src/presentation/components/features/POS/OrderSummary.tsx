import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../common/ui/select'
import { OrderItemRow } from './OrderItemRow'
import { ShoppingCart, Printer } from 'lucide-react'

interface OrderSummaryProps {
  items: OrderItem[]
  customerName: string
  tableNumber: string
  paymentMethod: string
  orderType: string
  deliveryFee: number
  serviceFee: number
  discountAmount: number
  onCustomerNameChange: (value: string) => void
  onTableNumberChange: (value: string) => void
  onPaymentMethodChange: (value: string) => void
  onOrderTypeChange: (value: string) => void
  onDeliveryFeeClick: () => void
  onServiceFeeClick: () => void
  onDiscountClick: () => void
  onUpdateQuantity: (menuItemId: string, quantity: number, itemIndex?: number) => void
  onRemove: (menuItemId: string, itemIndex?: number) => void
  onClearOrder: () => void
  onConfirmOrder: () => void
  onPrintReceipt?: () => void
  confirmButtonText?: string
}

export const OrderSummary = ({
  items,
  customerName,
  tableNumber,
  paymentMethod,
  orderType,
  deliveryFee,
  serviceFee,
  discountAmount,
  onCustomerNameChange,
  onTableNumberChange,
  onPaymentMethodChange,
  onOrderTypeChange,
  onDeliveryFeeClick,
  onServiceFeeClick,
  onDiscountClick,
  onUpdateQuantity,
  onRemove,
  onClearOrder,
  onConfirmOrder,
  onPrintReceipt,
  confirmButtonText = 'Confirm Order',
}: OrderSummaryProps) => {
  // Subtotal is the sum of item prices (which already include VAT)
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  // VAT is 12% of the items total
  const vat = itemsTotal * 0.12
  // Subtotal before VAT
  const subtotal = itemsTotal - vat
  // Total with fees and discount applied
  const total = itemsTotal + deliveryFee + serviceFee - discountAmount

  // const getOrderTypeIcon = () => {
  //   switch (orderType) {
  //     case 'DINE_IN': return <UtensilsCrossed className="h-3 w-3" />
  //     case 'TAKEOUT': return <Package className="h-3 w-3" />
  //     case 'DELIVERY': return <Bike className="h-3 w-3" />
  //     default: return <UtensilsCrossed className="h-3 w-3" />
  //   }
  // }

  // const getOrderTypeColor = () => {
  //   switch (orderType) {
  //     case 'DINE_IN': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  //     case 'TAKEOUT': return 'bg-amber-100 text-amber-700 border-amber-200'
  //     case 'DELIVERY': return 'bg-blue-100 text-blue-700 border-blue-200'
  //     default: return 'bg-gray-100 text-gray-700 border-gray-200'
  //   }
  // }

  return (
    <div className="flex flex-col h-full max-h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Compact Header with Order Type Pills */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Current Order</h2>
          <span className="text-xs text-gray-500">{items.length} items</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onOrderTypeChange('DINE_IN')}
            className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-medium transition-all ${
              orderType === 'DINE_IN'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Dine In
          </button>
          <button
            onClick={() => onOrderTypeChange('TAKEOUT')}
            className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-medium transition-all ${
              orderType === 'TAKEOUT'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Takeout
          </button>
          <button
            onClick={() => onOrderTypeChange('DELIVERY')}
            className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-medium transition-all ${
              orderType === 'DELIVERY'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Delivery
          </button>
        </div>
      </div>

      {/* Compact Form Fields - Single row */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Customer"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="h-8 flex-1 rounded-full border-gray-200 bg-gray-50 text-xs px-3"
          />
          {orderType === 'DINE_IN' && (
            <Input
              placeholder="Table"
              value={tableNumber}
              onChange={(e) => onTableNumberChange(e.target.value)}
              className="h-8 w-16 rounded-full border-gray-200 bg-gray-50 text-xs px-3"
            />
          )}
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger className="h-8 w-24 rounded-full border-gray-200 bg-gray-50 text-xs">
              <SelectValue placeholder="Pay" />
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

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <ShoppingCart className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No items yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => {
              // Pass itemIndex for items with variants, addons, or notes (can't be aggregated)
              const hasVariantOrAddons = item.variantId || (item.addons && item.addons.length > 0) || item.notes
              return (
                <OrderItemRow
                  key={`${item.menuItemId}-${item.variantId || 'base'}-${index}`}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                  itemIndex={hasVariantOrAddons ? index : undefined}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Compact Summary Section */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 space-y-2">
          {/* Compact Totals - Two columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAT</span>
              <span className="text-gray-700">₱{vat.toFixed(2)}</span>
            </div>
            {orderType === 'DELIVERY' && (
              <div className="flex justify-between">
                <button onClick={onDeliveryFeeClick} className="text-blue-600 underline text-xs">Delivery</button>
                <span className="text-gray-700">{deliveryFee > 0 ? `₱${deliveryFee.toFixed(2)}` : '₱0'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={onServiceFeeClick} className="text-purple-600 underline text-xs">Service</button>
              <span className="text-gray-700">{serviceFee > 0 ? `₱${serviceFee.toFixed(2)}` : '₱0'}</span>
            </div>
            <div className="flex justify-between">
              <button onClick={onDiscountClick} className="text-green-600 underline text-xs">Discount</button>
              <span className="text-green-600">{discountAmount > 0 ? `-₱${discountAmount.toFixed(2)}` : '₱0'}</span>
            </div>
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">₱{total.toFixed(2)}</span>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearOrder}
              className="h-9 px-4 rounded-full border-gray-300 text-xs font-medium"
            >
              Clear
            </Button>
            <Button
              onClick={onConfirmOrder}
              className="flex-1 h-9 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium"
            >
              {confirmButtonText}
            </Button>
          </div>
          {onPrintReceipt && (
            <Button
              variant="outline"
              onClick={onPrintReceipt}
              className="w-full h-9 rounded-full border-gray-300 text-xs font-medium flex items-center justify-center gap-1"
            >
              <Printer className="h-3 w-3" />
              Pay & Print
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
