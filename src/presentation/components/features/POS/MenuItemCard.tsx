import { useState } from 'react'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { Plus, Package } from 'lucide-react'

type MobileCardSize = 'small' | 'medium' | 'large'

interface MenuItemCardProps {
  item: MenuItem
  onAddToOrder: (item: MenuItem) => void
  maxServings?: number  // -1 means unlimited (no recipe), undefined means not loaded yet
  mobileSize?: MobileCardSize // Size for mobile view
  autoOutOfStock?: boolean // Whether to automatically mark items as out of stock when ingredients run out
}

export const MenuItemCard = ({ item, onAddToOrder, maxServings, mobileSize = 'medium', autoOutOfStock = false }: MenuItemCardProps) => {
  const [animations, setAnimations] = useState<number[]>([])

  // Use maxServings directly (backend already accounts for cart and preparing orders)
  const availableStock = maxServings

  // Check if item is manually marked as out of stock
  const isManuallyOutOfStock = (item as any).outOfStock === true

  const handleAddToOrder = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!item.available) return
    // Check manual out of stock flag (set by manager in Products page)
    if (isManuallyOutOfStock) return
    // Only prevent adding if autoOutOfStock is enabled AND out of stock based on recipe
    if (autoOutOfStock && availableStock !== undefined && availableStock !== -1 && availableStock <= 0) return
    
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
  // Mark as out of stock if:
  // 1. Manual outOfStock flag is set by manager, OR
  // 2. autoOutOfStock setting is enabled AND recipe-based stock is 0
  const isOutOfStock = isManuallyOutOfStock || (autoOutOfStock && hasRecipe && availableStock <= 0)
  const isLowStock = hasRecipe && availableStock > 0 && availableStock <= 5
  // Stock is 0 or negative - show red badge (not out of stock if autoOutOfStock is off, but still 0)
  const isZeroStock = hasRecipe && availableStock <= 0

  // Mobile size classes
  const mobileSizeClasses = {
    small: {
      card: 'p-1.5',
      image: 'aspect-square',
      title: 'text-[10px] mb-1',
      price: 'text-xs',
      button: 'h-6 w-6',
      buttonIcon: 'h-3 w-3',
      stockBadge: 'text-[9px] px-1 py-0',
    },
    medium: {
      card: 'p-2.5',
      image: 'aspect-square',
      title: 'text-xs mb-1.5',
      price: 'text-sm',
      button: 'h-14 w-14',
      buttonIcon: 'h-7 w-7',
      stockBadge: 'text-xs px-1.5 py-0.5',
    },
    large: {
      card: 'p-3',
      image: 'aspect-[4/3]',
      title: 'text-sm mb-2',
      price: 'text-base',
      button: 'h-16 w-16',
      buttonIcon: 'h-8 w-8',
      stockBadge: 'text-xs px-2 py-1',
    },
  }

  const sizeClasses = mobileSizeClasses[mobileSize]

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
      onClick={handleAddToOrder}
    >
      <div className={`${sizeClasses.image} bg-gray-100 relative overflow-hidden lg:aspect-square`}>
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
          <div className={`absolute top-1 right-1 rounded font-bold flex items-center gap-0.5 ${sizeClasses.stockBadge} ${
            isZeroStock
              ? 'bg-red-100 text-red-700 border border-red-300'
              : isLowStock 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            <Package className="h-3 w-3" />
            {Math.max(0, availableStock)}
          </div>
        )}
      </div>
      <div className={sizeClasses.card}>
        <h3 className={`font-semibold line-clamp-1 ${sizeClasses.title} lg:text-xs lg:mb-1.5`}>{item.name}</h3>
        <div className="flex items-center justify-between gap-1">
          <span className={`font-bold text-blue-600 ${sizeClasses.price} lg:text-sm`}>₱{item.price.toFixed(2)}</span>
          <Button
            size="sm"
            onClick={handleAddToOrder}
            disabled={!item.available || isOutOfStock}
            className={`${sizeClasses.button} lg:h-7 lg:w-auto lg:px-3 text-sm lg:text-xs rounded-full lg:rounded-md flex items-center justify-center p-0 lg:gap-1`}
          >
            <Plus className={`${sizeClasses.buttonIcon} lg:h-3 lg:w-3`} />
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
