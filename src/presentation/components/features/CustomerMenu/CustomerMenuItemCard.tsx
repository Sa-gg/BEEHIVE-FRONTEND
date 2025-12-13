import { useState } from 'react'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import type { MoodType } from '../../../../shared/utils/moodSystem'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { Plus, Sparkles, Info, X } from 'lucide-react'
import { getMoodExplanation, getItemNutrients } from '../../../../shared/utils/nutritionalBenefits'

interface CustomerMenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem, event?: React.MouseEvent) => void
  currentMood?: MoodType | null
  compact?: boolean // For horizontal scroll sections (best sellers, recommendations)
}

export const CustomerMenuItemCard = ({ item, onAddToCart, currentMood, compact = false }: CustomerMenuItemCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false)
  
  const moodExplanation = currentMood ? getMoodExplanation(item.name, currentMood) : null
  const nutrients = getItemNutrients(item.name)
  const hasScience = moodExplanation && nutrients.length > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    onAddToCart(item, e)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all relative">
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
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs">Unavailable</Badge>
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
              disabled={!item.available}
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
        <div className="px-2.5 pt-2 pb-2">
          <h3 className="font-semibold text-xs mb-2 line-clamp-2 min-h-[2rem]">{item.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: '#F9C900' }}>₱{item.price.toFixed(2)}</span>
            <button
              onClick={handleAddToCart}
              disabled={!item.available}
              className="h-14 w-14 lg:h-12 lg:w-12 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ 
                backgroundColor: '#F9C900',
                borderTopLeftRadius: '24px',
                borderBottomRightRadius: '8px'
              }}
            >
              <Plus className="h-7 w-7 lg:h-6 lg:w-6 text-black" />
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
