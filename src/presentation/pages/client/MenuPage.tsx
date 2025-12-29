import { useState, useEffect, useRef, useCallback } from 'react'
import { ClientLayout } from '../../components/layout/ClientLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem } from '../../../core/domain/entities/Order.entity'
import type { CustomerOrder } from '../../../core/domain/entities/CustomerOrder.entity'
import type { MoodType, MoodOption } from '../../../shared/utils/moodSystem'
import { getMoodByValue, analyzeMoodEffectiveness, setDynamicMoodSettings } from '../../../shared/utils/moodSystem'
import { getMoodExplanation } from '../../../shared/utils/nutritionalBenefits'
import type { MoodFeedbackConfig } from '../../../infrastructure/api/moodSettings.api'
import { CustomerMenuItemCard } from '../../components/features/CustomerMenu/CustomerMenuItemCard'
import { CartDrawer } from '../../components/features/CustomerMenu/CartDrawer'
import { CheckoutForm } from '../../components/features/CustomerMenu/CheckoutForm'
import { OrderConfirmation } from '../../components/features/CustomerMenu/OrderConfirmation'
import { MoodSelector } from '../../components/features/CustomerMenu/MoodSelector'
import { MoodReflectionModal } from '../../components/features/CustomerMenu/MoodReflectionModal'
import { CustomerDropdown } from '../../components/features/CustomerMenu/CustomerDropdown'
import { MyOrdersModal } from '../../components/features/CustomerMenu/MyOrdersModal'
import { Button } from '../../components/common/ui/button'
import { ShoppingBag, Sparkles, Loader2, Bell } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { moodSettingsApi } from '../../../infrastructure/api/moodSettings.api'
import { useAuthStore } from '../../store/authStore'
import { useOrderEvents } from '../../../shared/hooks/useOrderEvents'
import { getDeviceId } from '../../../shared/utils/deviceId'
import { playSuccessSound, vibrate } from '../../../shared/utils/notificationSound'

const CATEGORIES = ['all', 'best seller', 'pizza', 'appetizer', 'hot drinks', 'cold drinks', 'smoothie', 'platter', 'savers', 'value meal'] as const

type ViewState = 'menu' | 'checkout' | 'confirmation'

export const MenuPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // Initialize selectedMood from URL parameter
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(() => {
    const moodParam = searchParams.get('mood') as MoodType | null
    return (moodParam && getMoodByValue(moodParam)) ? moodParam : null
  })
  
  // Fetch menu items from API
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [viewState, setViewState] = useState<ViewState>('menu')
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null)
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [showMoodReflection, setShowMoodReflection] = useState(false)
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)
  
  // Order notifications state
  const [orderNotifications, setOrderNotifications] = useState(0)
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false)
  
  // Algorithm config from database (for dynamic scoring weights)
  const [feedbackConfig, setFeedbackConfig] = useState<MoodFeedbackConfig | null>(null)
  
  // Track if we've already tracked recommendations for current mood (prevent double-counting)
  const trackedMoodRef = useRef<string | null>(null)
  
  // Get device ID for guest order tracking
  const deviceId = getDeviceId()

  // Real-time order update handler
  const handleOrderUpdate = useCallback((order: unknown) => {
    const orderData = order as { customerName?: string; deviceId?: string; status: string }
    // Check if this order belongs to the current user (by name) or device
    const isMyOrder = 
      (user && (orderData.customerName === user.name || orderData.customerName === user.email)) ||
      orderData.deviceId === deviceId
    
    if (isMyOrder) {
      console.log('Order update for me:', orderData.status)
      // Trigger immediate refresh of order notifications
      refreshOrderNotifications()
      // Flash notification when order is ready
      if (orderData.status === 'READY') {
        playSuccessSound()
        vibrate([200, 100, 200])
        setHasOrderUpdates(true)
      }
    }
  }, [user, deviceId])

  // Function to refresh order notifications
  const refreshOrderNotifications = useCallback(async () => {
    try {
      let customerOrders
      
      if (user) {
        const allOrders = await ordersApi.getAll()
        customerOrders = allOrders.filter(
          order => order.customerName === user?.name || order.customerName === user?.email
        )
      } else {
        customerOrders = await ordersApi.getMyOrders()
      }
      
      const activeCount = customerOrders.filter(
        o => !['COMPLETED', 'CANCELLED'].includes(o.status)
      ).length
      
      let feedbackCount = 0
      if (feedbackConfig?.feedbackEnabled) {
        feedbackCount = customerOrders.filter(o => 
          o.status === 'COMPLETED' && o.moodContext && !o.moodFeedbackGiven
        ).length
      }
      
      const totalNotifs = activeCount + feedbackCount
      setOrderNotifications(totalNotifs)
      
      const hasReady = customerOrders.some(o => o.status === 'READY')
      setHasOrderUpdates(hasReady || feedbackCount > 0)
    } catch (error) {
      console.error('Failed to refresh order notifications:', error)
    }
  }, [user, feedbackConfig?.feedbackEnabled])

  // Subscribe to real-time order events for customers
  useOrderEvents({
    type: 'customer',
    onOrderUpdate: handleOrderUpdate
  })

  // Helper to convert API MoodSetting to MoodOption format
  const convertToMoodOption = (setting: any): MoodOption => ({
    value: setting.mood.toLowerCase() as MoodType,
    emoji: setting.emoji,
    label: setting.label,
    color: setting.color,
    description: setting.description,
    supportMessage: setting.supportMessage || undefined,
    scientificExplanation: setting.scientificExplanation || undefined,
    beneficialNutrients: setting.beneficialNutrients || [],
    preferredCategories: (setting.preferredCategories || []).map((c: string) => c.toLowerCase().replace('_', ' ')),
    excludeCategories: (setting.excludeCategories || []).map((c: string) => c.toLowerCase().replace('_', ' '))
  })

  // Fetch menu items and mood settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch menu items, mood settings, and feedback config in parallel
        const [menuResponse, moodSettings, config] = await Promise.all([
          menuItemsApi.getAll(),
          moodSettingsApi.getActiveMoodSettings().catch(() => null),
          moodSettingsApi.getFeedbackConfig().catch(() => null)
        ])
        
        // Process menu items
        const items = Array.isArray(menuResponse) ? menuResponse : menuResponse.data || []
        const transformedItems = items.map((item: any) => ({
          ...item,
          category: item.category.toLowerCase().replace('_', ' ') as MenuItem['category']
        }))
        setMenuItems(transformedItems)
        
        // Set dynamic mood settings if available
        if (moodSettings && moodSettings.length > 0) {
          const converted = moodSettings.map(convertToMoodOption)
          setDynamicMoodSettings(converted)
        }
        
        // Set feedback config for dynamic scoring weights
        if (config) {
          setFeedbackConfig(config)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setMenuItems([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Scroll to top when component mounts or mood changes from URL
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Auto-show mood selector when navigating with showMood=true (from Mood-Based Menu button)
  useEffect(() => {
    const showMoodParam = searchParams.get('showMood')
    if (showMoodParam === 'true' && !selectedMood) {
      setShowMoodSelector(true)
      // Clear the param from URL to prevent re-showing on refresh
      navigate('/menu', { replace: true })
    }
  }, [searchParams, selectedMood, navigate])

  // Poll for order updates when user is authenticated or guest with device ID
  useEffect(() => {
    refreshOrderNotifications()
    const interval = setInterval(refreshOrderNotifications, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [refreshOrderNotifications])

  const currentMood = selectedMood ? getMoodByValue(selectedMood) : null
  
  // Get dynamic scoring weights from config (with fallbacks)
  const scoringWeights = {
    moodBenefits: feedbackConfig?.moodBenefitsWeight ?? 20,
    preferredCategory: feedbackConfig?.preferredCategoryWeight ?? 10,
    historical: feedbackConfig?.historicalDataWeight ?? 15,
    featured: feedbackConfig?.featuredItemWeight ?? 5,
    timeOfDay: feedbackConfig?.timeOfDayWeight ?? 5
  }
  
  // Get current time context for time-based scoring
  const getTimeContext = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    return 'evening'
  }

  // Helper function to get full image URL from backend
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  const addToCart = (menuItem: MenuItem, event?: React.MouseEvent) => {
    // Get click position for animation
    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      setFlyingItem({ 
        id: menuItem.id, 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      })
      // Clear animation after it completes
      setTimeout(() => setFlyingItem(null), 850)
    }

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.menuItemId === menuItem.id)
      
      if (existingItem) {
        return prev.map((item) =>
          item.menuItemId === menuItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        )
      }
      
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          subtotal: menuItem.price,
        },
      ]
    })
  }

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId)
      return
    }
    
    setCartItems((prev) =>
      prev.map((item) =>
        item.menuItemId === menuItemId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price,
            }
          : item
      )
    )
  }

  const removeItem = (menuItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId))
  }

  const clearAllItems = () => {
    setCartItems([])
  }

  const handleCheckout = () => {
    setViewState('checkout')
    setIsCartOpen(false)
  }

  const handleSubmitOrder = async (data: { customerName: string; tableNumber: string; notes: string; orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'; paymentMethod: string }) => {
    try {
      setIsSubmitting(true)
      
      // Prepare order items for API
      const orderItems = cartItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price
      }))

      // Create order via API
      const response = await ordersApi.create({
        customerName: data.customerName || user?.name || undefined,
        tableNumber: data.tableNumber || undefined,
        orderType: data.orderType,
        moodContext: selectedMood || undefined,
        paymentMethod: data.paymentMethod,
        createdBy: user ? 'Customer' : 'Guest Customer', // Track if customer is logged in or guest
        items: orderItems
      })

      // Convert API response to CustomerOrder format for display
      const order: CustomerOrder = {
        id: response.id,
        orderNumber: response.orderNumber,
        items: cartItems,
        subtotal: response.subtotal,
        tax: response.tax,
        total: response.totalAmount,
        status: response.status.toLowerCase() as 'pending',
        customerName: response.customerName || undefined,
        tableNumber: response.tableNumber || undefined,
        notes: data.notes || undefined,
        deviceId: response.deviceId || undefined, // For real-time tracking
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      }

      setConfirmedOrder(order)
      setViewState('confirmation')
      setCartItems([]) // Clear cart after successful order

      // Show mood reflection if mood was selected
      if (selectedMood) {
        setTimeout(() => {
          setShowMoodReflection(true)
        }, 2000)
      }
    } catch (error: any) {
      console.error('Failed to submit order:', error)
      console.error('Error details:', error.response?.data)
      const errorMessage = error.response?.data?.error || 'Failed to place order. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectMood = async (mood: MoodType) => {
    setSelectedMood(mood)
    setShowMoodSelector(false)
    // Reset tracked mood ref so useEffect will track for the new mood
    trackedMoodRef.current = null
  }
  
  // Track shown items when mood is selected and recommendations are computed
  const trackRecommendedItems = async (mood: MoodType, itemIds: string[]) => {
    // Only track if we haven't already tracked for this mood
    if (trackedMoodRef.current === mood) {
      return
    }
    trackedMoodRef.current = mood
    
    try {
      await moodSettingsApi.trackMoodShown(mood, itemIds)
    } catch (error) {
      console.error('Failed to track mood shown:', error)
      // Don't block UX if tracking fails
    }
  }

  const getRecommendedItems = (): MenuItem[] => {
    if (!selectedMood) return []
    
    const moodConfig = getMoodByValue(selectedMood)
    if (!moodConfig) return []

    // Get AI-based recommendations from past successes
    const { topItems } = analyzeMoodEffectiveness(selectedMood)
    
    // Ensure menuItems is an array
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : []
    
    // Start with all available items from API
    const recommended = safeMenuItems.filter(item => {
      // Exclude categories based on mood (e.g., no cold drinks for sad mood)
      if (moodConfig.excludeCategories?.includes(item.category)) return false
      return item.available
    })

    // Score each item based on multiple factors using DYNAMIC weights from config
    const timeContext = getTimeContext()
    const scoredItems = recommended.map(item => {
      let score = 0
      
      // HIGHEST PRIORITY: Items with scientific mood explanations
      const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
      if (hasExplanation) {
        score += scoringWeights.moodBenefits
      }
      
      // Preferred categories boost
      if (moodConfig.preferredCategories?.includes(item.category)) {
        score += scoringWeights.preferredCategory
      }
      
      // Items from successful past orders (historical success)
      if (topItems.includes(item.name)) {
        score += scoringWeights.historical
      }
      
      // Featured/best seller items boost
      if (item.featured) {
        score += scoringWeights.featured
      }
      
      // Time of day context boost (+5 pts)
      // Morning: boost hot drinks and light breakfast items
      // Evening: boost hot drinks and comfort food
      if (timeContext === 'morning' && item.category === 'hot drinks') {
        score += scoringWeights.timeOfDay
      } else if (timeContext === 'evening' && (item.category === 'hot drinks' || item.category === 'platter')) {
        score += scoringWeights.timeOfDay
      }
      
      return { item, score, hasExplanation }
    })

    // Filter items: only show if they have mood benefits OR are in preferred category OR featured
    const filteredItems = scoredItems.filter(({ score, hasExplanation, item }) => {
      // Always show if has mood benefits
      if (hasExplanation) return true
      
      // Show items in preferred categories
      if (moodConfig.preferredCategories?.includes(item.category)) return true
      
      // Show featured items
      if (item.featured) return true
      
      // Show if score is above minimum threshold
      if (score >= scoringWeights.featured) return true
      
      return false
    })

    // Sort by score and return top items
    const topRecommended = filteredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(scored => scored.item)
    
    return topRecommended
  }
  
  // Track recommendations when selectedMood changes (only once per mood selection)
  useEffect(() => {
    if (!selectedMood || trackedMoodRef.current === selectedMood) {
      return
    }
    
    // Get recommended items for tracking (same logic as getRecommendedItems with dynamic weights)
    const moodConfig = getMoodByValue(selectedMood)
    if (!moodConfig) return
    
    const timeContext = getTimeContext()
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : []
    const recommended = safeMenuItems.filter(item => {
      if (moodConfig.excludeCategories?.includes(item.category)) return false
      return item.available
    })
    
    const scoredItems = recommended.map(item => {
      let score = 0
      const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
      if (hasExplanation) score += scoringWeights.moodBenefits
      if (moodConfig.preferredCategories?.includes(item.category)) score += scoringWeights.preferredCategory
      if (item.featured) score += scoringWeights.featured
      // Time of day boost
      if (timeContext === 'morning' && item.category === 'hot drinks') {
        score += scoringWeights.timeOfDay
      } else if (timeContext === 'evening' && (item.category === 'hot drinks' || item.category === 'platter')) {
        score += scoringWeights.timeOfDay
      }
      return { item, score, hasExplanation }
    })
    
    const filteredItems = scoredItems.filter(({ score, hasExplanation, item }) => {
      if (hasExplanation) return true
      if (moodConfig.preferredCategories?.includes(item.category)) return true
      if (item.featured) return true
      if (score >= scoringWeights.featured) return true
      return false
    })
    
    const topRecommended = filteredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(scored => scored.item)
    
    if (topRecommended.length > 0) {
      const itemIds = topRecommended.map(item => item.id)
      trackRecommendedItems(selectedMood, itemIds)
    }
  }, [selectedMood, menuItems, scoringWeights])

  const handleNewOrder = () => {
    setCartItems([])
    setConfirmedOrder(null)
    setViewState('menu')
    setSelectedCategory('all')
    setSelectedMood(null)
    setShowMoodReflection(false)
  }

  const handleBackToMenu = () => {
    setViewState('menu')
  }

  // Ensure menuItems is always an array
  const safeMenuItems = Array.isArray(menuItems) ? menuItems : []
  
  const filteredItems = selectedCategory === 'all' 
    ? safeMenuItems 
    : selectedCategory === 'best seller'
    ? safeMenuItems.filter(item => item.featured) // Use featured flag for best sellers
    : safeMenuItems.filter((item) => item.category === selectedCategory)
  const recommendedItems = getRecommendedItems()
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (viewState === 'checkout') {
    return (
      <CheckoutForm
        items={cartItems}
        onSubmit={handleSubmitOrder}
        onBack={handleBackToMenu}
        isSubmitting={isSubmitting}
      />
    )
  }

  if (viewState === 'confirmation' && confirmedOrder) {
    return (
      <OrderConfirmation
        order={confirmedOrder}
        onNewOrder={handleNewOrder}
      />
    )
  }

  return (
    <ClientLayout hideHeader={true}>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#F9C900' }}>BEEHIVE Menu</h1>
                <p className="text-sm text-gray-600">Order from your phone</p>
              </div>
              <div className="flex items-center gap-3">
                <CustomerDropdown onViewOrders={() => setShowMyOrders(true)} />
                <img 
                  src="/assets/logo.png" 
                  alt="BEEHIVE" 
                  className="h-12 w-12 object-contain cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate('/')}
                />
              </div>
            </div>

            {/* Mood Selector Button */}
            {!selectedMood ? (
              <button
                onClick={() => setShowMoodSelector(true)}
                className="w-full mb-4 p-4 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-50 hover:bg-yellow-100 transition-all flex items-center justify-center gap-3"
              >
                <Sparkles className="h-5 w-5" style={{ color: '#F9C900' }} />
                <div className="text-left">
                  <p className="font-bold text-sm">How are you feeling today?</p>
                  <p className="text-xs text-gray-600">Get personalized menu recommendations</p>
                </div>
              </button>
            ) : (
              <div className="mb-4 space-y-3">
                {/* Mood Status Card */}
                <div className="p-4 rounded-xl border-2 bg-linear-to-r from-yellow-50 to-orange-50" style={{ borderColor: currentMood?.color }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{currentMood?.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">You're feeling {currentMood?.label}</p>
                        <p className="text-xs text-gray-600">{currentMood?.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMood(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Change
                    </button>
                  </div>
                  {currentMood?.supportMessage && (
                    <div className="mt-3 p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-700">{currentMood.supportMessage}</p>
                    </div>
                  )}
                </div>

                {/* Scientific Explanation Banner */}
                {currentMood?.scientificExplanation && (
                  <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full shrink-0">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-blue-900 mb-1.5">Why These Foods Help</h4>
                        <p className="text-xs text-gray-700 leading-relaxed mb-2">
                          {currentMood.scientificExplanation}
                        </p>
                        {currentMood.beneficialNutrients && currentMood.beneficialNutrients.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {currentMood.beneficialNutrients.map((nutrient) => (
                              <span
                                key={nutrient}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium"
                              >
                                {nutrient}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Recommended Items for Mood */}
            {selectedMood && recommendedItems.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: '#F9C900' }} />
                  Recommended for You
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {recommendedItems.map((item) => (
                    <div key={item.id} className="shrink-0" style={{ width: '140px' }}>
                      <CustomerMenuItemCard item={item} onAddToCart={addToCart} currentMood={selectedMood} compact getImageUrl={getImageUrl} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Sellers */}
            {!selectedMood && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  🔥 Best Sellers
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading menu...</span>
                    </div>
                  ) : (
                    menuItems.filter(item => item.featured).map((item) => (
                      <div key={item.id} className="shrink-0" style={{ width: '140px' }}>
                        <CustomerMenuItemCard item={item} onAddToCart={addToCart} currentMood={selectedMood} compact getImageUrl={getImageUrl} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize whitespace-nowrap"
                  style={
                    selectedCategory === category
                      ? { backgroundColor: '#F9C900', color: '#000000' }
                      : {}
                  }
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: '#F9C900' }} />
              <p className="text-sm">Loading delicious menu...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map((item) => (
                <CustomerMenuItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={addToCart}
                  currentMood={selectedMood}
                  getImageUrl={getImageUrl}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Cart Button */}
        {cartCount > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform hover:scale-110 ${flyingItem ? 'animate-bounce' : ''}`}
            style={{ backgroundColor: '#F9C900' }}
          >
            <ShoppingBag className="h-7 w-7 text-black" />
            <span
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#000000' }}
            >
              {cartCount}
            </span>
          </button>
        )}

        {/* Floating Orders Button with Bee Icon - positioned on left for better mobile UX */}
        {user && (
          <button
            onClick={() => setShowMyOrders(true)}
            className={`fixed bottom-6 left-6 z-50 group transition-all duration-300 ${
              hasOrderUpdates || orderNotifications > 0 ? 'animate-bounce-slow' : ''
            }`}
          >
            <div className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
              orderNotifications > 0 
                ? 'bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-yellow-300' 
                : 'bg-white border-2 border-gray-200 hover:border-yellow-400'
            } hover:shadow-2xl hover:scale-110`}>
              {/* Bee Emoji */}
              <span className={`text-2xl transition-transform duration-300 ${orderNotifications > 0 ? 'animate-wiggle' : 'group-hover:scale-110'}`}>
                🐝
              </span>
            </div>
            
            {/* Notification Badge */}
            {orderNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500 shadow-lg">
                {orderNotifications}
              </span>
            )}
            
            {/* Ready Order Pulse Effect */}
            {hasOrderUpdates && (
              <span className="absolute -top-2 -left-2 w-5 h-5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center shadow-sm">
                  <Bell className="h-2.5 w-2.5 text-white" />
                </span>
              </span>
            )}
            
            {/* Label on hover */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity shadow-lg">
              My Orders
            </span>
          </button>
        )}

        {/* Custom animation styles */}
        <style>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg); }
            75% { transform: rotate(5deg); }
          }
          .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
          .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
        `}</style>

        {/* Flying Item Animation */}
        {flyingItem && (
          <div
            className="fixed z-[100] pointer-events-none fly-to-cart-anim"
            style={{
              left: flyingItem.x,
              top: flyingItem.y,
              '--start-x': `${flyingItem.x}px`,
              '--start-y': `${flyingItem.y}px`,
              '--end-x': `calc(100vw - 1.5rem - 2rem)`,
              '--end-y': `calc(100vh - 1.5rem - 2rem)`,
            } as React.CSSProperties}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: '#F9C900' }}
            >
              <ShoppingBag className="h-5 w-5 text-black" />
            </div>
          </div>
        )}

        <style>{`
          .fly-to-cart-anim {
            animation: flyToCart 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          @keyframes flyToCart {
            0% {
              left: var(--start-x);
              top: var(--start-y);
              transform: scale(1);
              opacity: 1;
            }
            100% {
              left: var(--end-x);
              top: var(--end-y);
              transform: scale(0.3);
              opacity: 0;
            }
          }
        `}</style>

        {/* Cart Drawer */}
        <CartDrawer
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onClearAll={clearAllItems}
          onCheckout={handleCheckout}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        />

        {/* Mood Selector Modal */}
        {showMoodSelector && (
          <MoodSelector
            onSelectMood={handleSelectMood}
            onClose={() => setShowMoodSelector(false)}
          />
        )}

        {/* Mood Reflection Modal */}
        {showMoodReflection && confirmedOrder && selectedMood && (
          <MoodReflectionModal
            orderId={confirmedOrder.id}
            orderNumber={confirmedOrder.orderNumber}
            originalMood={selectedMood}
            itemsOrdered={confirmedOrder.items.map(item => item.name)}
            onClose={() => setShowMoodReflection(false)}
          />
        )}

        {/* My Orders Modal */}
        <MyOrdersModal
          open={showMyOrders}
          onOpenChange={setShowMyOrders}
          onFeedbackSubmitted={refreshOrderNotifications}
        />
      </div>
    </ClientLayout>
  )
}
