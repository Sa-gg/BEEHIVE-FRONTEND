import { useState } from 'react'
import { Button } from '../../common/ui/button'
import type { MoodType } from '../../../../shared/utils/moodSystem'
import { getMoodByValue, saveMoodReflection } from '../../../../shared/utils/moodSystem'
import { Smile, Meh, Frown } from 'lucide-react'

interface MoodReflectionModalProps {
  orderId: string
  orderNumber: string
  originalMood: MoodType
  itemsOrdered: string[]
  onClose: () => void
}

export const MoodReflectionModal = ({
  orderId,
  orderNumber,
  originalMood,
  itemsOrdered,
  onClose,
}: MoodReflectionModalProps) => {
  const [reflection, setReflection] = useState<'better' | 'same' | 'worse' | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const mood = getMoodByValue(originalMood)

  const handleSubmitReflection = (feeling: 'better' | 'same' | 'worse') => {
    setReflection(feeling)
    
    // Save reflection
    saveMoodReflection({
      orderId,
      originalMood,
      feelingAfter: feeling,
      timestamp: new Date(),
      itemsOrdered,
    })

    setShowThankYou(true)
    
    // Auto close after 3 seconds
    setTimeout(() => {
      onClose()
    }, 3000)
  }

  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          {reflection === 'better' ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-3">We're so glad to hear that!</h2>
              <p className="text-gray-600 mb-4">
                Your happiness is our success! Thank you for sharing your experience with us.
              </p>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  Keep smiling! 😊
                </p>
              </div>
            </>
          ) : reflection === 'same' ? (
            <>
              <div className="text-6xl mb-4">💙</div>
              <h2 className="text-2xl font-bold mb-3">Thank you for your feedback!</h2>
              <p className="text-gray-600 mb-4">
                We appreciate you letting us know. We'll keep working to make your next visit even better.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Here's a 10% discount code for your next order: <span className="font-bold">CARE10</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🤗</div>
              <h2 className="text-2xl font-bold mb-3">We're here for you</h2>
              <p className="text-gray-600 mb-4">
                We're sorry you're still feeling down. Please know that we care and want to help.
              </p>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 font-medium mb-2">
                  Here's a special 20% discount for your next visit: <span className="font-bold">CARE20</span>
                </p>
                <p className="text-xs text-purple-600">
                  Remember, it's okay to not be okay. Take care of yourself. 💜
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{mood?.emoji}</span>
            <div>
              <h2 className="text-xl font-bold">How are you feeling now?</h2>
              <p className="text-sm text-gray-600">Order #{orderNumber}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            You started feeling <span className="font-semibold">{mood?.label}</span>. 
            We'd love to know if we helped brighten your day!
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          <button
            onClick={() => handleSubmitReflection('better')}
            className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all flex items-center gap-4"
          >
            <Smile className="h-8 w-8 text-green-500" />
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">😊 Feeling Better!</h3>
              <p className="text-sm text-gray-600">Your order helped improve my mood</p>
            </div>
          </button>

          <button
            onClick={() => handleSubmitReflection('same')}
            className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-4"
          >
            <Meh className="h-8 w-8 text-blue-500" />
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">😐 About the Same</h3>
              <p className="text-sm text-gray-600">No change, but the food was good</p>
            </div>
          </button>

          <button
            onClick={() => handleSubmitReflection('worse')}
            className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-4"
          >
            <Frown className="h-8 w-8 text-purple-500" />
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">😔 Still Down</h3>
              <p className="text-sm text-gray-600">I'm still not feeling great</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}
