import { useState } from 'react'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { Plus, Package } from 'lucide-react'

interface MenuItemCardProps {
  item: MenuItem
  onAddToOrder: (item: MenuItem) => void
  maxServings?: number  // -1 means unlimited (no recipe), undefined means not loaded yet
}

export const MenuItemCard = ({ item, onAddToOrder, maxServings }: MenuItemCardProps) => {
  const [animations, setAnimations] = useState<number[]>([])

  // Use maxServings directly (backend already accounts for cart and preparing orders)
  const availableStock = maxServings

  const handleAddToOrder = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!item.available) return
    // Prevent adding if out of stock based on recipe
    if (availableStock !== undefined && availableStock !== -1 && availableStock <= 0) return
    
    onAddToOrder(item)
    
    // Add new animation
    const animationId = Date.now()
    setAnimations(prev => [...prev, animationId])
    
    // Remove animation after it completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(id => id !== animationId))
    }, 400)
  }

  // Determine stock status (using available stock after cart deduction)
  const hasRecipe = availableStock !== undefined && availableStock !== -1
  const isOutOfStock = hasRecipe && availableStock <= 0
  const isLowStock = hasRecipe && availableStock > 0 && availableStock <= 5

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
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
        {(!item.available || isOutOfStock) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        {/* Stock indicator badge */}
        {hasRecipe && !isOutOfStock && (
          <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-0.5 ${
            isLowStock 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            <Package className="h-3 w-3" />
            {availableStock}
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
            disabled={!item.available || isOutOfStock}
            className="h-14 w-14 lg:h-7 lg:w-auto lg:px-3 text-sm lg:text-xs rounded-full lg:rounded-md flex items-center justify-center p-0 lg:gap-1"
          >
            <Plus className="h-7 w-7 lg:h-3 lg:w-3" />
            <span className="hidden lg:inline">Add</span>
          </Button>
        </div>
      </div>
      
      {/* +1 Animation Stack */}
      {animations.map((animationId, index) => (
        <div 
          key={animationId}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ 
            animationDelay: `${index * 50}ms`,
            left: `calc(50% + ${(index % 3 - 1) * 15}px)` 
          }}
        >
          <div className="text-4xl font-bold text-green-500 animate-ping-scale">
            +1
          </div>
        </div>
      ))}
      
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
          animation: ping-scale 0.4s cubic-bezier(0.4, 0, 0.6, 1);
        }
      `}</style>
    </div>
  )
}
