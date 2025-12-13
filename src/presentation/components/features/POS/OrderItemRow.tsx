import type { OrderItem } from '../../../../core/domain/entities/Order.entity'
import { Button } from '../../common/ui/button'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface OrderItemRowProps {
  item: OrderItem
  onUpdateQuantity: (menuItemId: string, quantity: number) => void
  onRemove: (menuItemId: string) => void
}

export const OrderItemRow = ({ item, onUpdateQuantity, onRemove }: OrderItemRowProps) => {
  return (
    <div className="flex items-center gap-2 py-3 border-b border-gray-200">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.name}</h4>
        <p className="text-xs text-gray-500">₱{item.price.toFixed(2)} each</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
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
        onClick={() => onRemove(item.menuItemId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
