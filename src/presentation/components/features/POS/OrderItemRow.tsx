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
  const hasVariantOrAddons = item.variantId || (item.addons && item.addons.length > 0)
  
  // Calculate addon total using unitPrice
  const addonsTotal = item.addons?.reduce((sum, addon) => sum + (addon.unitPrice * addon.quantity), 0) || 0
  
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
            {item.variantName && (
              <span className="text-xs text-gray-500">({item.variantName})</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            ₱{item.price.toFixed(2)}
            {item.variantPriceDelta && item.variantPriceDelta !== 0 && (
              <span className="text-amber-600">
                {item.variantPriceDelta > 0 ? ` +${item.variantPriceDelta.toFixed(2)}` : ` ${item.variantPriceDelta.toFixed(2)}`}
              </span>
            )}
            {' each'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1, itemIndex)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1, itemIndex)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="w-20 text-right font-semibold text-sm">
          ₱{item.subtotal.toFixed(2)}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(item.menuItemId, itemIndex)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Add-ons display */}
      {item.addons && item.addons.length > 0 && (
        <div className="ml-4 mt-1 space-y-0.5">
          {item.addons.map((addon, idx) => (
            <div key={idx} className="flex items-center text-xs text-gray-500">
              <span className="text-amber-500 mr-1">+</span>
              <span className="flex-1">
                {addon.addonName} {addon.quantity > 1 && `×${addon.quantity}`}
              </span>
              <span className="text-gray-400">₱{(addon.unitPrice * addon.quantity).toFixed(2)}</span>
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
