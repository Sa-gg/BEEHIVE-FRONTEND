import { useState } from 'react'
import type { MoodRecommendation } from '../../../../shared/utils/moodRecommendations'
import type { MenuItem } from '../../../../core/domain/entities/MenuItem.entity'
import { ChevronRight } from 'lucide-react'

interface MoodRecommendationCardProps {
  recommendation: MoodRecommendation
  onSelectItem: (item: MenuItem) => void
}

export const MoodRecommendationCard = ({ recommendation, onSelectItem }: MoodRecommendationCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: '#F9C900' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <span className="text-4xl">{recommendation.emoji}</span>
          <div>
            <h3 className="text-xl font-bold mb-1">{recommendation.title}</h3>
            <p className="text-sm text-gray-600">{recommendation.description}</p>
          </div>
        </div>
        <ChevronRight 
          className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          style={{ color: '#F9C900' }}
        />
      </button>

      {/* Items Grid */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {recommendation.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-gray-50 rounded-lg p-3 hover:bg-yellow-50 transition-all border border-transparent hover:border-yellow-400 text-left"
              >
                {item.image && (
                  <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <h4 className="font-semibold text-xs line-clamp-2 mb-1">{item.name}</h4>
                <p className="text-sm font-bold" style={{ color: '#F9C900' }}>
                  ₱{item.price.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
          {recommendation.items.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">No items available for this mood</p>
          )}
        </div>
      )}
    </div>
  )
}
