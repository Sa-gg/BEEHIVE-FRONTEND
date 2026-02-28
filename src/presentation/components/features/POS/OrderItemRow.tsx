import { useState } from 'react'
import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface OrderItemRowProps {
  item: OrderItem
  onUpdateQuantity: (menuItemId: string, quantity: number, itemIndex?: number) => void
  onRemove: (menuItemId: string, itemIndex?: number) => void
  itemIndex?: number // Index for items with variants/addons (since they can't be aggregated)
}

export const OrderItemRow = ({ item, onUpdateQuantity, onRemove, itemIndex }: OrderItemRowProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.quantity.toString())
  
  const handleQuantityClick = () => {
    setEditValue(item.quantity.toString())
    setIsEditing(true)
  }
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers
    const value = e.target.value.replace(/[^0-9]/g, '')
    setEditValue(value)
  }
  
  const handleQuantityBlur = () => {
    const newQuantity = parseInt(editValue, 10)
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onUpdateQuantity(item.menuItemId, newQuantity, itemIndex)
    } else if (newQuantity === 0 || editValue === '') {
      // If 0 or empty, remove the item
      onRemove(item.menuItemId, itemIndex)
    }
    setIsEditing(false)
  }
  
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuantityBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(item.quantity.toString())
    }
  }
  
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
            {item.variantName && (
              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap">
                {item.variantName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <span>₱{item.price.toFixed(2)}</span>
            {item.variantPriceDelta && item.variantPriceDelta !== 0 && (
              <span className="text-amber-600 font-medium">
                {item.variantPriceDelta > 0 ? `+₱${item.variantPriceDelta.toFixed(2)}` : `-₱${Math.abs(item.variantPriceDelta).toFixed(2)}`}
              </span>
            )}
            <span className="text-gray-400">each</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1, itemIndex)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          {isEditing ? (
            <input
              type="text"
              inputMode="numeric"
              value={editValue}
              onChange={handleQuantityChange}
              onBlur={handleQuantityBlur}
              onKeyDown={handleQuantityKeyDown}
              autoFocus
              className="w-10 h-7 text-center text-sm font-medium border border-yellow-400 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          ) : (
            <button
              onClick={handleQuantityClick}
              className="w-8 h-7 text-center text-sm font-medium hover:bg-gray-100 rounded transition-colors cursor-text"
              title="Click to edit quantity"
            >
              {item.quantity}
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1, itemIndex)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="w-20 text-right font-semibold text-sm shrink-0">
          ₱{item.subtotal.toFixed(2)}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
          onClick={() => onRemove(item.menuItemId, itemIndex)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Add-ons display - aligned with subtotal column */}
      {item.addons && item.addons.length > 0 && (
        <div className="mt-1.5 pl-2 border-l-2 border-amber-200 ml-1 space-y-0.5">
          {item.addons.map((addon, idx) => (
            <div key={idx} className="flex items-center text-xs">
              <span className="text-amber-500 mr-1.5">+</span>
              <span className="flex-1 text-gray-600">
                {addon.addonName} {addon.quantity > 1 && <span className="text-gray-400">×{addon.quantity}</span>}
              </span>
              <span className="text-amber-600 font-medium w-20 text-right">₱{(addon.unitPrice * addon.quantity).toFixed(2)}</span>
              {/* Spacer to align with delete button */}
              <span className="w-7 shrink-0"></span>
            </div>
          ))}
        </div>
      )}
      
      {/* Notes display */}
      {item.notes && (
        <div className="ml-4 mt-1">
          <p className="text-xs text-gray-400 italic">Note: {item.notes}</p>
        </div>
      )}
    </div>
  )
}
