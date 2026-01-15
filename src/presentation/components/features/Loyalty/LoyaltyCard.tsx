import { useState, useEffect } from 'react'
import { loyaltyApi, type CustomerLoyaltyDTO, STAMPS_FOR_REWARD } from '../../../../infrastructure/api/loyalty.api'
import { Coffee, Award, Star } from 'lucide-react'
import { cn } from '../../../../shared/utils/cn'

interface LoyaltyCardProps {
  deviceId?: string
  customerPhone?: string
  customerEmail?: string
  compact?: boolean
  className?: string
  onRewardAvailable?: (availableRewards: number) => void
}

export const LoyaltyCard = ({ 
  deviceId, 
  customerPhone, 
  customerEmail,
  compact = false,
  className,
  onRewardAvailable
}: LoyaltyCardProps) => {
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLoyalty = async () => {
      if (!deviceId && !customerPhone && !customerEmail) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await loyaltyApi.lookup({
          deviceId,
          customerPhone,
          customerEmail
        })
        
        if (result.found && result.customer) {
          setLoyalty(result.customer)
          onRewardAvailable?.(result.customer.availableRewards)
        }
      } catch (err: any) {
        console.error('Failed to fetch loyalty:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLoyalty()
  }, [deviceId, customerPhone, customerEmail, onRewardAvailable])

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3", className)}>
        <div className="h-4 bg-amber-200 dark:bg-amber-700 rounded w-24 mb-2"></div>
        <div className="h-6 bg-amber-200 dark:bg-amber-700 rounded w-32"></div>
      </div>
    )
  }

  if (error || !loyalty) {
    // Show empty state for new customers
    return (
      <div className={cn(
        "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-700",
        className
      )}>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Coffee className="w-4 h-4" />
          <span className="text-sm font-medium">Start earning stamps!</span>
        </div>
        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
          {STAMPS_FOR_REWARD} stamps = 1 free drink
        </p>
      </div>
    )
  }

  const { currentStamps, availableRewards, totalStamps, stampsToNextReward } = loyalty

  // Compact view for checkout sidebar
  if (compact) {
    return (
      <div className={cn(
        "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-700",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {currentStamps}/{STAMPS_FOR_REWARD} stamps
            </span>
          </div>
          {availableRewards > 0 && (
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
              <Award className="w-3 h-3" />
              {availableRewards} free drink{availableRewards > 1 ? 's' : ''}!
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full view with stamp visualization
  return (
    <div className={cn(
      "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-yellow-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700 shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 rounded-full">
            <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Loyalty Rewards</h3>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {totalStamps} total stamps collected
            </p>
          </div>
        </div>
        {availableRewards > 0 && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
            <Award className="w-4 h-4" />
            {availableRewards} FREE!
          </div>
        )}
      </div>

      {/* Stamp progress visualization */}
      <div className="flex gap-1.5 justify-center mb-3">
        {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
              i < currentStamps
                ? "bg-amber-500 text-white shadow-md scale-100"
                : "bg-amber-100 dark:bg-amber-800/50 text-amber-300 dark:text-amber-600 scale-90"
            )}
          >
            <Star className={cn(
              "w-4 h-4",
              i < currentStamps && "fill-current"
            )} />
          </div>
        ))}
      </div>

      {/* Progress text */}
      <div className="text-center">
        {stampsToNextReward > 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-bold">{stampsToNextReward}</span> more {stampsToNextReward === 1 ? 'stamp' : 'stamps'} until your free drink!
          </p>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400 font-bold">
            🎉 You've earned a free drink!
          </p>
        )}
      </div>
    </div>
  )
}
