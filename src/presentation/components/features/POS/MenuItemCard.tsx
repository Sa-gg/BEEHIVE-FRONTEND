import { useState } from 'react'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { Plus } from 'lucide-react'

interface MenuItemCardProps {
  item: MenuItem
  onAddToOrder: (item: MenuItem) => void
}

export const MenuItemCard = ({ item, onAddToOrder }: MenuItemCardProps) => {
  const [showAddAnimation, setShowAddAnimation] = useState(false)

  const handleAddToOrder = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!item.available) return
    
    onAddToOrder(item)
    setShowAddAnimation(true)
    setTimeout(() => setShowAddAnimation(false), 600)
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={handleAddToOrder}
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-semibold text-xs mb-1.5 line-clamp-1">{item.name}</h3>
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-bold text-blue-600">₱{item.price.toFixed(2)}</span>
          <Button
            size="sm"
            onClick={handleAddToOrder}
            disabled={!item.available}
            className="h-14 w-14 lg:h-7 lg:w-auto lg:px-3 text-sm lg:text-xs rounded-full lg:rounded-md flex items-center justify-center p-0 lg:gap-1"
          >
            <Plus className="h-7 w-7 lg:h-3 lg:w-3" />
            <span className="hidden lg:inline">Add</span>
          </Button>
        </div>
      </div>
      
      {/* +1 Animation */}
      {showAddAnimation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="text-4xl font-bold text-green-500 animate-ping-scale">
            +1
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes ping-scale {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2) translateY(-20px);
          }
        }
        .animate-ping-scale {
          animation: ping-scale 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}
