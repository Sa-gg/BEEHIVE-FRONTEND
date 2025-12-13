import { useState } from 'react'
import type { MoodType, MoodOption } from '../../../../shared/utils/moodSystem'
import { MOOD_OPTIONS } from '../../../../shared/utils/moodSystem'
import { X, Info } from 'lucide-react'

interface MoodSelectorProps {
  onSelectMood: (mood: MoodType) => void
  onClose: () => void
}

export const MoodSelector = ({ onSelectMood, onClose }: MoodSelectorProps) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [showScience, setShowScience] = useState<MoodType | null>(null)

  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMood(mood.value)
    setTimeout(() => {
      onSelectMood(mood.value)
    }, 300)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg sm:w-full shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slide-up sm:animate-none">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 sm:p-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl shrink-0">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold mb-0.5">How are you feeling?</h2>
            <p className="text-xs text-gray-600">AI-powered recommendations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Mood Options - Scrollable */}
        <div className="p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 overflow-y-auto">
          {MOOD_OPTIONS.map((mood) => (
            <div key={mood.value} className="relative">
              <button
                onClick={() => handleSelectMood(mood)}
                className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedMood === mood.value
                    ? 'border-yellow-400 bg-yellow-50 shadow-lg'
                    : 'border-gray-200 active:border-yellow-300'
                }`}
              >
                <div className="text-3xl sm:text-4xl mb-1.5 sm:mb-2">{mood.emoji}</div>
                <h3 className="font-bold text-sm sm:text-base mb-0.5">{mood.label}</h3>
                <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1">{mood.description}</p>
                
                {mood.supportMessage && (
                  <div className="mt-2 p-1.5 bg-blue-50 rounded-lg">
                    <p className="text-[9px] sm:text-xs text-blue-700 line-clamp-2">{mood.supportMessage}</p>
                  </div>
                )}
              </button>
              
              {/* Science Info Button */}
              {mood.scientificExplanation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowScience(showScience === mood.value ? null : mood.value)
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-white rounded-full shadow-md hover:bg-blue-50 transition-colors border border-gray-200"
                  title="View scientific explanation"
                >
                  <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
                </button>
              )}
              
              {/* Scientific Explanation Tooltip */}
              {showScience === mood.value && mood.scientificExplanation && (
                <div className="absolute z-10 mt-1 left-0 right-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 max-h-48 overflow-y-auto">
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-semibold text-xs text-blue-900 flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      Why This Helps
                    </h4>
                    <button
                      onClick={() => setShowScience(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-700 leading-relaxed mb-2">
                    {mood.scientificExplanation}
                  </p>
                  {mood.beneficialNutrients && mood.beneficialNutrients.length > 0 && (
                    <div className="border-t pt-1.5">
                      <p className="text-[10px] font-semibold text-gray-600 mb-1">Key Nutrients:</p>
                      <div className="flex flex-wrap gap-1">
                        {mood.beneficialNutrients.map((nutrient) => (
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
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-4 py-3 sm:p-4 rounded-b-3xl sm:rounded-b-2xl shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-4 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
