import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { ordersApi, type OrderResponse } from '../../../../infrastructure/api/orders.api'
import { moodSettingsApi, type MoodFeedbackConfig } from '../../../../infrastructure/api/moodSettings.api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../common/ui/dialog'
import { Badge } from '../../common/ui/badge'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { 
  Loader2, 
  Package, 
  Clock, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Smile, 
  Meh, 
  Frown, 
  CheckCircle,
  ChefHat,
  UtensilsCrossed,
  Bell,
  X,
  MapPin,
  Receipt,
  ThumbsUp,
  PartyPopper
} from 'lucide-react'

interface MyOrdersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFeedbackSubmitted?: () => void
}

interface RatingState {
  [orderId: string]: 'improved' | 'same' | 'worse' | null
}

// Order status with friendly names and progress
const ORDER_STATUS_CONFIG = {
  PENDING: { 
    label: 'Order Received', 
    emoji: '📥', 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    progress: 25,
    message: 'Your order has been received'
  },
  PREPARING: { 
    label: 'Being Prepared', 
    emoji: '👨‍🍳', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    progress: 50,
    message: 'Chef is preparing your meal'
  },
  READY: { 
    label: 'Ready for Pickup', 
    emoji: '✅', 
    color: 'bg-green-100 text-green-700 border-green-200',
    progress: 75,
    message: 'Your order is ready!'
  },
  COMPLETED: { 
    label: 'Completed', 
    emoji: '🎉', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    progress: 100,
    message: 'Enjoy your meal!'
  },
  CANCELLED: { 
    label: 'Cancelled', 
    emoji: '❌', 
    color: 'bg-red-100 text-red-700 border-red-200',
    progress: 0,
    message: 'Order cancelled'
  },
}

export const MyOrdersModal = ({ open, onOpenChange, onFeedbackSubmitted }: MyOrdersModalProps) => {
  const { user, isAuthenticated } = useAuthStore()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'track'>('active')
  const [trackOrderNumber, setTrackOrderNumber] = useState('')
  const [trackedOrder, setTrackedOrder] = useState<OrderResponse | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [ratings, setRatings] = useState<RatingState>({})
  const [ratingInProgress, setRatingInProgress] = useState<string | null>(null)
  const [feedbackConfig, setFeedbackConfig] = useState<MoodFeedbackConfig | null>(null)
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState<string | null>(null)

  // Check if a specific order can receive feedback
  const canOrderReceiveFeedback = useCallback((order: OrderResponse): boolean => {
    // Must be completed with mood context and not already rated
    if (order.status !== 'COMPLETED' || !order.moodContext || order.moodFeedbackGiven) return false
    if (ratings[order.id]) return false
    
    // Feedback must be enabled - this is the main gate
    // When feedbackEnabled is ON, allow feedback regardless of baseline
    // (baseline is for auto-enabling, not for blocking when manually enabled)
    return feedbackConfig?.feedbackEnabled === true
  }, [feedbackConfig?.feedbackEnabled, ratings])

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      let customerOrders: OrderResponse[]
      
      if (user) {
        // For authenticated users, filter by name
        const allOrders = await ordersApi.getAll()
        customerOrders = allOrders.filter(
          order => order.customerName === user?.name || order.customerName === user?.email
        )
      } else {
        // For guests, fetch orders by device ID
        customerOrders = await ordersApi.getMyOrders()
      }
      
      customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setOrders(customerOrders)
      
      // Check for orders that need feedback - using canOrderReceiveFeedback logic
      const eligibleOrder = customerOrders.find(o => canOrderReceiveFeedback(o))
      if (eligibleOrder) {
        setShowFeedbackPrompt(eligibleOrder.id)
      } else {
        setShowFeedbackPrompt(null)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.name, user?.email, canOrderReceiveFeedback])

  const fetchFeedbackConfig = async () => {
    try {
      const config = await moodSettingsApi.getFeedbackConfig()
      setFeedbackConfig(config)
    } catch (error) {
      console.error('Failed to fetch feedback config:', error)
    }
  }

  // Fetch config first, then orders
  useEffect(() => {
    if (open) {
      // Fetch config first so orders can check feedbackEnabled
      fetchFeedbackConfig().then(() => {
        fetchOrders()
      })
    }
  }, [open])

  // Re-fetch orders when feedbackConfig changes
  useEffect(() => {
    if (open && feedbackConfig) {
      fetchOrders()
    }
  }, [feedbackConfig, open, fetchOrders])

  // Auto-refresh orders every 30 seconds when modal is open
  useEffect(() => {
    if (!open) return
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [open, fetchOrders])

  const handleTrackOrder = async () => {
    if (!trackOrderNumber.trim()) {
      setTrackError('Please enter an order number')
      return
    }

    try {
      setIsTracking(true)
      setTrackError(null)
      const order = await ordersApi.trackByOrderNumber(trackOrderNumber.trim().toUpperCase())
      setTrackedOrder(order)
    } catch (error: any) {
      console.error('Failed to track order:', error)
      setTrackError('Order not found. Please check the order number and try again.')
      setTrackedOrder(null)
    } finally {
      setIsTracking(false)
    }
  }

  const handleRateMood = async (orderId: string, mood: string, outcome: 'improved' | 'same' | 'worse') => {
    try {
      setRatingInProgress(orderId)
      await moodSettingsApi.recordMoodFeedback(mood.toUpperCase(), outcome, orderId)
      setRatings(prev => ({ ...prev, [orderId]: outcome }))
      setShowFeedbackPrompt(null)
      // Refresh orders to update moodFeedbackGiven flag
      await fetchOrders()
      // Notify parent to refresh notifications
      onFeedbackSubmitted?.()
    } catch (error: any) {
      console.error('Failed to record feedback:', error)
      if (error.response?.data?.error === 'Feedback already given for this order') {
        setRatings(prev => ({ ...prev, [orderId]: 'already-given' as any }))
        setShowFeedbackPrompt(null)
      }
    } finally {
      setRatingInProgress(null)
    }
  }

  const toggleOrderExpanded = (orderId: string) => {
    // When expanding one card, collapse all others
    setExpandedOrders(prev => {
      const newSet = new Set<string>()
      if (!prev.has(orderId)) {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const getOrderTypeInfo = (orderType: string) => {
    const types: Record<string, { emoji: string; label: string }> = {
      DINE_IN: { emoji: '🍽️', label: 'Dine In' },
      TAKEOUT: { emoji: '🥡', label: 'Takeout' },
      DELIVERY: { emoji: '🛵', label: 'Delivery' },
    }
    return types[orderType] || { emoji: '📦', label: orderType }
  }

  const getMoodEmoji = (moodContext: string | null) => {
    if (!moodContext) return null
    const emojis: Record<string, string> = {
      happy: '😊', energetic: '⚡', relaxed: '😌', excited: '🎉',
      tired: '😴', stressed: '😰', anxious: '😟', sad: '😢',
      depressed: '😔', angry: '😠'
    }
    return emojis[moodContext.toLowerCase()] || '🙂'
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get active orders (not completed or cancelled)
  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status))
  const historyOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status))
  // Only count orders that can actually receive feedback
  const ordersNeedingFeedback = orders.filter(o => canOrderReceiveFeedback(o))
  const notificationCount = activeOrders.length + ordersNeedingFeedback.length

  // Status progress steps (consistent with OrderConfirmation)
  const STATUS_STEPS = [
    { status: 'PENDING', label: 'Received', icon: CheckCircle },
    { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
    { status: 'READY', label: 'Ready', icon: Bell },
    { status: 'COMPLETED', label: 'Done', icon: PartyPopper },
  ]

  const getStatusIndex = (status: string) => {
    const index = STATUS_STEPS.findIndex(s => s.status === status)
    return index >= 0 ? index : 0
  }

  const renderProgressBar = (status: string) => {
    const currentStatusIndex = getStatusIndex(status)
    const isReady = status === 'READY'
    const isCancelled = status === 'CANCELLED'
    
    if (isCancelled) {
      return (
        <div className="w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <span className="text-red-600 font-medium text-sm">❌ Order Cancelled</span>
          </div>
        </div>
      )
    }
    
    return (
      <div className="w-full">
        {/* Progress Line with Steps */}
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 rounded-full">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                isReady ? 'bg-green-400' : 'bg-amber-400'
              }`}
              style={{ width: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
          </div>
          
          {/* Status Steps */}
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index <= currentStatusIndex
              const isCurrent = index === currentStatusIndex
              
              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCurrent 
                      ? isReady ? 'bg-green-500 ring-2 ring-green-200 scale-110' : 'bg-amber-400 ring-2 ring-amber-200 scale-110'
                      : isActive 
                        ? isReady ? 'bg-green-400' : 'bg-amber-400'
                        : 'bg-gray-200'
                  }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <span className={`mt-1 text-[10px] text-center font-medium ${
                    isCurrent ? isReady ? 'text-green-600' : 'text-amber-600' : isActive ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Status Message */}
        <div className={`mt-3 py-1.5 px-3 rounded-lg text-center text-xs font-medium ${
          isReady 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {isReady 
            ? '🔔 Ready for pickup!' 
            : status === 'COMPLETED' 
              ? '✅ Enjoy your meal!' 
              : '⏳ Working on your order...'}
        </div>
      </div>
    )
  }

  const renderOrderCard = (order: OrderResponse, compact = false) => {
    const isExpanded = expandedOrders.has(order.id)
    const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.PENDING
    const hasRated = ratings[order.id] !== undefined || order.moodFeedbackGiven
    // Use the proper check for feedback eligibility (includes baseline check)
    const canRate = canOrderReceiveFeedback(order) && !hasRated
    const moodEmoji = getMoodEmoji(order.moodContext)
    const orderType = getOrderTypeInfo(order.orderType)
    
    // Different border colors based on status for visual distinction
    const borderColor = order.status === 'READY' 
      ? 'border-green-300 shadow-green-100' 
      : order.status === 'PREPARING' 
        ? 'border-blue-200' 
        : order.status === 'COMPLETED'
          ? 'border-gray-200'
          : 'border-amber-200'
    
    const bgColor = isExpanded 
      ? order.status === 'READY' ? 'bg-green-50' : 'bg-white' 
      : 'bg-white'

    return (
      <div key={order.id} className={`rounded-2xl border-2 ${borderColor} shadow-sm overflow-hidden transition-all duration-200 ${bgColor} ${isExpanded ? 'ring-2 ring-amber-200' : ''}`}>
        {/* Order Header */}
        <div 
          className={`p-4 cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-gray-50' : ''}`}
          onClick={() => toggleOrderExpanded(order.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">#{order.orderNumber}</span>
              {moodEmoji && (
                <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">{moodEmoji}</span>
              )}
              {order.status === 'READY' && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isExpanded && <span className="text-xs text-amber-600 font-medium">Tap to collapse</span>}
              {isExpanded ? <ChevronUp className="h-5 w-5 text-amber-500" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </div>
          </div>

          {!compact && !['COMPLETED', 'CANCELLED'].includes(order.status) && (
            <div className="mb-3">{renderProgressBar(order.status)}</div>
          )}

          {compact && (
            <div className="mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                {statusConfig.emoji} {statusConfig.label}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span>{orderType.emoji} {orderType.label}</span>
              {order.tableNumber && <span>• T{order.tableNumber}</span>}
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {getTimeSince(order.createdAt)}
              </span>
            </div>
            <span className="font-bold text-lg" style={{ color: '#F9C900' }}>₱{order.totalAmount.toFixed(0)}</span>
          </div>

          {!isExpanded && order.order_items.length > 0 && (
            <div className="mt-2 text-xs text-gray-400 truncate">
              {order.order_items.slice(0, 2).map((item, i) => (
                <span key={item.id}>{i > 0 && ', '}{item.quantity}x {(item as any).menu_items?.name || 'Item'}</span>
              ))}
              {order.order_items.length > 2 && <span> +{order.order_items.length - 2} more</span>}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100">
            <div className="p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Items</span>
              </div>
              <div className="space-y-2">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 bg-yellow-50 text-yellow-700 rounded-full text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <span className="text-gray-800 text-sm">{(item as any).menu_items?.name || 'Item'}</span>
                    </div>
                    <span className="font-medium text-sm">₱{item.subtotal.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-1.5 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Summary</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>₱{(order.totalAmount / 1.12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>VAT (12%)</span><span>₱{(order.totalAmount - order.totalAmount / 1.12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                <span>Total</span>
                <span style={{ color: '#F9C900' }}>₱{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-sm">
                <span className="text-gray-500">Payment</span>
                <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'outline'} className="text-xs">
                  {order.paymentStatus === 'PAID' ? '✓ Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            {canRate && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-700">How do you feel now?</span>
                </div>
                <p className="text-xs text-purple-600 mb-3">You ordered based on {moodEmoji} mood</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { outcome: 'improved' as const, icon: Smile, color: 'green', label: 'Better!' },
                    { outcome: 'same' as const, icon: Meh, color: 'blue', label: 'Same' },
                    { outcome: 'worse' as const, icon: Frown, color: 'orange', label: 'Not really' }
                  ].map(({ outcome, icon: Icon, color, label }) => (
                    <button
                      key={outcome}
                      onClick={(e) => { e.stopPropagation(); handleRateMood(order.id, order.moodContext!, outcome) }}
                      disabled={ratingInProgress === order.id}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border-2 border-${color}-200 hover:border-${color}-400 hover:bg-${color}-50 transition-all active:scale-95`}
                    >
                      <Icon className={`h-7 w-7 text-${color}-500`} />
                      <span className={`text-xs font-semibold text-${color}-700`}>{label}</span>
                    </button>
                  ))}
                </div>
                {ratingInProgress === order.id && (
                  <div className="flex justify-center mt-2">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  </div>
                )}
              </div>
            )}

            {hasRated && (
              <div className="p-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm text-green-700">Thanks for your feedback!</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderFeedbackPrompt = () => {
    if (!showFeedbackPrompt) return null
    const order = orders.find(o => o.id === showFeedbackPrompt)
    if (!order) return null
    const moodEmoji = getMoodEmoji(order.moodContext)
    
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-xl text-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{moodEmoji}</span>
              <div>
                <p className="font-semibold">How are you feeling?</p>
                <p className="text-xs opacity-90">After #{order.orderNumber}</p>
              </div>
            </div>
            <button onClick={() => setShowFeedbackPrompt(null)} className="p-1 hover:bg-white/20 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { outcome: 'improved' as const, icon: Smile, label: 'Better!' },
              { outcome: 'same' as const, icon: Meh, label: 'Same' },
              { outcome: 'worse' as const, icon: Frown, label: 'Not really' }
            ].map(({ outcome, icon: Icon, label }) => (
              <button
                key={outcome}
                onClick={() => handleRateMood(order.id, order.moodContext!, outcome)}
                disabled={ratingInProgress === order.id}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-3xl">
          <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" style={{ color: '#F9C900' }} />
              My Orders
              {notificationCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {notificationCount}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex border-b bg-white px-2 pt-2">
            {[
              { key: 'active' as const, icon: ChefHat, label: 'Active', count: activeOrders.length },
              { key: 'history' as const, icon: Clock, label: 'History', count: 0 },
              { key: 'track' as const, icon: Search, label: 'Track', count: 0 }
            ].map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === key ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-xs bg-yellow-400 text-yellow-900 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
            {activeTab === 'active' && (
              <div className="p-4 space-y-3">
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium mb-1">Sign in to view orders</p>
                    <p className="text-sm text-gray-400">Or use Track tab</p>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#F9C900' }} />
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <ChefHat className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium mb-1">No active orders</p>
                    <p className="text-sm text-gray-400">Orders will appear here</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={fetchOrders} className="text-gray-500 h-8">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                      </Button>
                    </div>
                    {activeOrders.map((order) => renderOrderCard(order))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-4 space-y-3">
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium">Sign in to view history</p>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#F9C900' }} />
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium">No order history</p>
                  </div>
                ) : (
                  <>
                    {ordersNeedingFeedback.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-purple-700 font-medium">
                            {ordersNeedingFeedback.length} order{ordersNeedingFeedback.length > 1 ? 's' : ''} need feedback
                          </span>
                        </div>
                      </div>
                    )}
                    {historyOrders.map((order) => renderOrderCard(order, true))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'track' && (
              <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-600 mb-3">Enter your order number</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ORD-XXXXX"
                      value={trackOrderNumber}
                      onChange={(e) => setTrackOrderNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()}
                      className="flex-1 h-11 rounded-xl"
                    />
                    <Button 
                      onClick={handleTrackOrder}
                      disabled={isTracking}
                      style={{ backgroundColor: '#F9C900' }}
                      className="text-black hover:bg-yellow-500 h-11 px-4 rounded-xl"
                    >
                      {isTracking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </Button>
                  </div>
                  {trackError && <p className="text-sm text-red-500 mt-2 flex items-center gap-1"><X className="h-4 w-4" /> {trackError}</p>}
                </div>
                {trackedOrder && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Order Found!</span>
                    </div>
                    {renderOrderCard(trackedOrder)}
                  </div>
                )}
                {!trackedOrder && !trackError && (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                    <MapPin className="h-10 w-10 mb-2" />
                    <p className="text-sm">Enter order number above</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!open && renderFeedbackPrompt()}

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  )
}
