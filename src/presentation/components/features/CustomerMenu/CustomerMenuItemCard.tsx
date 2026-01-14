import { useState } from 'react'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import type { MoodType } from '../../../../shared/utils/moodSystem'
import { Badge } from '../../common/ui/badge'
import { Plus, Sparkles, Info, X } from 'lucide-react'
import { getMoodExplanation, getItemNutrients } from '../../../../shared/utils/nutritionalBenefits'

interface CustomerMenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem, event?: React.MouseEvent) => void
  currentMood?: MoodType | null
  compact?: boolean // For horizontal scroll sections (best sellers, recommendations)
  getImageUrl?: (imagePath: string | null) => string | null
}

export const CustomerMenuItemCard = ({ item, onAddToCart, currentMood, compact = false, getImageUrl }: CustomerMenuItemCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false)
  
  // Use database moodBenefits and nutrients (database-only, no static fallback)
  const moodExplanation = currentMood ? getMoodExplanation(item.name, currentMood, item.moodBenefits) : null
  const nutrients = getItemNutrients(item.nutrients)
  const hasScience = moodExplanation && nutrients.length > 0

  // Get full image URL from backend
  const imageUrl = getImageUrl ? getImageUrl(item.image || null) : item.image

  // Check if item is marked as out of stock (manually by manager)
  const isOutOfStock = (item as any).outOfStock === true
  // Item is effectively unavailable if not available OR marked out of stock
  const isUnavailable = !item.available || isOutOfStock

  const handleAddToCart = (e: React.MouseEvent) => {
    if (isUnavailable) return
    onAddToCart(item, e)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all relative">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs">{isOutOfStock ? 'Out of Stock' : 'Unavailable'}</Badge>
          </div>
        )}
        {hasScience && (
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-blue-50 transition-colors border border-blue-200"
            title="Why this helps your mood"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          </button>
        )}
      </div>
      {compact ? (
        // Compact layout for Best Sellers / Recommendations
        <div className="px-2 pt-2 pb-2">
          <h3 className="font-semibold text-xs mb-2 line-clamp-2 min-h-[2rem]">{item.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: '#F9C900' }}>₱{item.price.toFixed(2)}</span>
            <button
              onClick={handleAddToCart}
              disabled={isUnavailable}
              className="h-12 w-12 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ 
                backgroundColor: '#F9C900',
                borderTopLeftRadius: '20px',
                borderBottomRightRadius: '8px'
              }}
            >
              <Plus className="h-6 w-6 text-black" />
            </button>
          </div>
        </div>
      ) : (
        // Regular grid layout - using same curved button design
        <div className="px-2 pt-1.5 pb-1.5">
          <h3 className="font-semibold text-[10px] sm:text-xs mb-1.5 line-clamp-2 min-h-[1.75rem]">{item.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold" style={{ color: '#F9C900' }}>₱{item.price.toFixed(2)}</span>
            <button
              onClick={handleAddToCart}
              disabled={isUnavailable}
              className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ 
                backgroundColor: '#F9C900',
                borderTopLeftRadius: '20px',
                borderBottomRightRadius: '6px'
              }}
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* Scientific Explanation Modal */}
      {showExplanation && moodExplanation && (
        <div className="absolute inset-0 bg-white rounded-lg shadow-2xl border-2 border-blue-300 z-10 p-3 overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Why {item.name} Helps
            </h4>
            <button
              onClick={() => setShowExplanation(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-700 leading-relaxed mb-2">
            {moodExplanation}
          </p>
          {nutrients.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-[10px] font-semibold text-gray-600 mb-1">Key Nutrients:</p>
              <div className="flex flex-wrap gap-1">
                {nutrients.map((nutrient) => (
                  <span
                    key={nutrient}
                    className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-medium"
                  >
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
