import { useState, useEffect, useRef, useCallback } from 'react'
import { ClientLayout } from '../../components/layout/ClientLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem, OrderItemAddon } from '../../../core/domain/entities/Order.entity'
import type { CustomerOrder } from '../../../core/domain/entities/CustomerOrder.entity'
import type { MoodType, MoodOption } from '../../../shared/utils/moodSystem'
import { getMoodByValue, setDynamicMoodSettings } from '../../../shared/utils/moodSystem'
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
import { AddonsVariantsModal } from '../../components/features/shared/AddonsVariantsModal'
import { Button } from '../../components/common/ui/button'
import { ShoppingBag, Sparkles, Loader2, Bell } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { addonsApi } from '../../../infrastructure/api/addons.api'
import { categoriesApi, type CategoryDTO } from '../../../infrastructure/api/categories.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { moodSettingsApi } from '../../../infrastructure/api/moodSettings.api'
import { useAuthStore } from '../../store/authStore'
import { useOrderEvents } from '../../../shared/hooks/useOrderEvents'
import { getDeviceId } from '../../../shared/utils/deviceId'
import { playSuccessSound, vibrate } from '../../../shared/utils/notificationSound'

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
  
  // Fetch menu items and categories from API
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
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
  
  // Addons/Variants modal state
  const [showAddonsModal, setShowAddonsModal] = useState(false)
  const [selectedMenuItemForAddons, setSelectedMenuItemForAddons] = useState<MenuItem | null>(null)
  const [menuItemsWithAddons, setMenuItemsWithAddons] = useState<Set<string>>(new Set())
  
  // Order notifications state
  const [orderNotifications, setOrderNotifications] = useState(0)
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false)
  
  // Algorithm config from database (for dynamic scoring weights)
  const [feedbackConfig, setFeedbackConfig] = useState<MoodFeedbackConfig | null>(null)
  
  // Mood item stats from backend (for historical success scoring)
  // Extended type to include all fields needed for Wilson Score and exploration bonus
  const [moodItemStats, setMoodItemStats] = useState<Map<string, { 
    orderRate: number
    improvementRate: number
    timesShown: number
    timesOrdered: number
    feedbackCount: number
    moodImproved: number
  }>>(new Map())
  
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

  // Helper function to get full image URL from backend
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Fetch menu items and mood settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch menu items using browse API (handles showInMenu for ADDONs), categories, mood settings
        const [browseData, categoriesResponse, moodSettings, config] = await Promise.all([
          addonsApi.getMenuItemsForBrowsing({ available: true }),
          categoriesApi.getAll(),
          moodSettingsApi.getActiveMoodSettings().catch(() => null),
          moodSettingsApi.getFeedbackConfig().catch(() => null)
        ])
        
        // Set categories
        setCategories(categoriesResponse.data)
        
        // Build set of menu items that have variants or add-ons
        const itemsWithAddons = new Set<string>()
        browseData.forEach((item: any) => {
          if ((item.variants && item.variants.length > 0) || (item.allowed_addons && item.allowed_addons.length > 0)) {
            itemsWithAddons.add(item.id)
          }
        })
        setMenuItemsWithAddons(itemsWithAddons)
        
        // Process menu items - browseData already respects showInMenu flag for ADDONs
        const transformedItems = browseData.map((item: any) => ({
          ...item,
          categoryId: item.categoryId,
          category: (item.category?.displayName || item.category?.name || '').toLowerCase().replace('_', ' '),
          image: getImageUrl(item.image)
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
  
  // Fetch mood item stats from backend when mood changes
  useEffect(() => {
    const fetchMoodItemStats = async () => {
      if (!selectedMood) {
        setMoodItemStats(new Map())
        return
      }
      
      try {
        // Fetch per-item stats for the selected mood from backend
        const stats = await moodSettingsApi.getTopItemsForMood(selectedMood, 50)
        
        // Create a map of menuItemId -> full stats object for Wilson Score calculations
        const statsMap = new Map<string, { 
          orderRate: number
          improvementRate: number
          timesShown: number
          timesOrdered: number
          feedbackCount: number
          moodImproved: number
        }>()
        
        if (Array.isArray(stats)) {
          stats.forEach((stat: any) => {
            statsMap.set(stat.menuItemId, {
              orderRate: stat.orderRate || 0,
              improvementRate: stat.improvementRate || 0,
              timesShown: stat.timesShown || 0,
              timesOrdered: stat.timesOrdered || 0,
              feedbackCount: stat.feedbackCount || 0,
              moodImproved: stat.moodImproved || 0
            })
          })
        }
        
        setMoodItemStats(statsMap)
      } catch (error) {
        console.error('Failed to fetch mood item stats:', error)
        setMoodItemStats(new Map())
      }
    }
    
    fetchMoodItemStats()
  }, [selectedMood])
  
  // Get dynamic scoring weights from config (with fallbacks)
  const scoringWeights = {
    moodBenefits: feedbackConfig?.moodBenefitsWeight ?? 20,
    preferredCategory: feedbackConfig?.preferredCategoryWeight ?? 10,
    excludedCategoryPenalty: feedbackConfig?.excludedCategoryPenalty ?? 0, // 0 = filter out, >0 = penalty points
    historical: feedbackConfig?.historicalDataWeight ?? 15,
    featured: feedbackConfig?.featuredItemWeight ?? 5,
    timeOfDay: feedbackConfig?.timeOfDayWeight ?? 5,
    explorationBonus: feedbackConfig?.explorationBonusWeight ?? 8,
    minimumOrders: feedbackConfig?.minimumOrdersThreshold ?? 10
  }
  
  // Get configurable time slots from config
  const timeConfig = {
    morningStart: feedbackConfig?.morningStartHour ?? 6,
    morningEnd: feedbackConfig?.morningEndHour ?? 12,
    afternoonEnd: feedbackConfig?.afternoonEndHour ?? 18,
    morningCategories: feedbackConfig?.morningCategories 
      ? (typeof feedbackConfig.morningCategories === 'string' 
          ? JSON.parse(feedbackConfig.morningCategories) 
          : feedbackConfig.morningCategories)
      : ['HOT_DRINKS'],
    afternoonCategories: feedbackConfig?.afternoonCategories
      ? (typeof feedbackConfig.afternoonCategories === 'string'
          ? JSON.parse(feedbackConfig.afternoonCategories)
          : feedbackConfig.afternoonCategories)
      : [],
    eveningCategories: feedbackConfig?.eveningCategories
      ? (typeof feedbackConfig.eveningCategories === 'string'
          ? JSON.parse(feedbackConfig.eveningCategories)
          : feedbackConfig.eveningCategories)
      : ['HOT_DRINKS', 'PLATTER']
  }
  
  // Get current time context for time-based scoring (using configurable hours)
  const getTimeContext = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours()
    if (hour >= timeConfig.morningStart && hour < timeConfig.morningEnd) return 'morning'
    if (hour >= timeConfig.morningEnd && hour < timeConfig.afternoonEnd) return 'afternoon'
    return 'evening'
  }

  const addToCart = (menuItem: MenuItem, event?: React.MouseEvent) => {
    // Check if this item has variants or add-ons
    if (menuItemsWithAddons.has(menuItem.id)) {
      // Open addons/variants modal
      setSelectedMenuItemForAddons(menuItem)
      setShowAddonsModal(true)
      return
    }
    
    // Simple item without variants/add-ons - add directly
    addSimpleItemToCart(menuItem, event)
  }
  
  // Add a simple item without variants/add-ons
  const addSimpleItemToCart = (menuItem: MenuItem, event?: React.MouseEvent) => {
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
      // For simple items without variants/addons, aggregate by menuItemId
      const existingItem = prev.find((item) => 
        item.menuItemId === menuItem.id && 
        !item.variantId && 
        (!item.addons || item.addons.length === 0)
      )
      
      if (existingItem) {
        return prev.map((item) =>
          item.menuItemId === menuItem.id && !item.variantId && (!item.addons || item.addons.length === 0)
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
  
  // Add item with variants/add-ons from the modal
  const addItemWithAddonsToCart = (data: {
    variantId: string | null
    variantName: string | null
    variantPriceDelta: number
    addons: OrderItemAddon[]
    notes: string
    finalPrice: number
  }) => {
    if (!selectedMenuItemForAddons) return
    
    const orderItem: OrderItem = {
      menuItemId: selectedMenuItemForAddons.id,
      name: selectedMenuItemForAddons.name,
      price: selectedMenuItemForAddons.price,
      quantity: 1,
      subtotal: data.finalPrice,
      variantId: data.variantId || undefined,
      variantName: data.variantName || undefined,
      variantPriceDelta: data.variantPriceDelta || undefined,
      notes: data.notes || undefined,
      addons: data.addons.length > 0 ? data.addons.map(a => ({
        addonItemId: a.addonItemId,
        addonName: a.addonName,
        unitPrice: a.unitPrice,
        quantity: a.quantity,
        subtotal: a.unitPrice * a.quantity
      })) : undefined
    }
    
    setCartItems(prev => [...prev, orderItem])
    setShowAddonsModal(false)
    setSelectedMenuItemForAddons(null)
  }

  const updateQuantity = (menuItemId: string, quantity: number, itemIndex?: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId, itemIndex)
      return
    }
    
    setCartItems((prev) => {
      // For items with variants/add-ons, use itemIndex to identify the specific item
      if (itemIndex !== undefined) {
        return prev.map((item, idx) =>
          idx === itemIndex
            ? {
                ...item,
                quantity,
                // Recalculate subtotal with variant delta and addons
                subtotal: quantity * (item.price + (item.variantPriceDelta || 0) + 
                  (item.addons?.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0) || 0)),
              }
            : item
        )
      }
      
      // For simple items, use menuItemId
      return prev.map((item) =>
        item.menuItemId === menuItemId && !item.variantId && (!item.addons || item.addons.length === 0)
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price,
            }
          : item
      )
    })
  }

  const removeItem = (menuItemId: string, itemIndex?: number) => {
    setCartItems((prev) => {
      // For items with variants/add-ons, use itemIndex
      if (itemIndex !== undefined) {
        return prev.filter((_, idx) => idx !== itemIndex)
      }
      // For simple items, match by menuItemId (and ensure it's a simple item)
      return prev.filter((item) => 
        item.menuItemId !== menuItemId || item.variantId || (item.addons && item.addons.length > 0)
      )
    })
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
      
      // Prepare order items for API - include variant and addon data
      const orderItems = cartItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        variantId: item.variantId || undefined,
        variantPriceDelta: item.variantPriceDelta || undefined,
        notes: item.notes || undefined,
        addons: item.addons?.map(a => ({
          addonItemId: a.addonItemId,
          quantity: a.quantity,
          unitPrice: a.unitPrice
        })) || undefined
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
      
      // Immediately refresh order notifications for real-time count
      refreshOrderNotifications()

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

  // ==================== STATISTICAL HELPER FUNCTIONS ====================
  
  /**
   * Wilson Score Confidence Interval (Lower Bound)
   * Used by Reddit, Yelp, Amazon for ranking with uncertainty
   * 
   * Problem it solves: Item with 5/5 orders (100%) shouldn't beat item with 450/500 (90%)
   * because 5 orders is too small a sample to be confident
   * 
   * @param successes - Number of successful outcomes (e.g., orders, mood improvements)
   * @param total - Total number of trials (e.g., times shown, feedback count)
   * @param confidence - Z-score for confidence level (1.96 = 95% confidence)
   * @returns Lower bound of confidence interval (conservative estimate)
   */
  const wilsonScore = (successes: number, total: number, confidence: number = 1.96): number => {
    if (total === 0) return 0
    
    const p = successes / total  // Point estimate (e.g., 100%)
    const n = total              // Sample size
    const z = confidence         // Z-score for 95% confidence
    
    // Wilson Score formula
    const denominator = 1 + z * z / n
    const center = p + z * z / (2 * n)
    const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    
    return Math.max(0, (center - margin) / denominator)
  }
  
  /**
   * Exploration Bonus (Upper Confidence Bound - UCB)
   * Gives bonus points to under-sampled items to encourage trying them
   * 
   * Problem it solves: Popular items get 80% of exposure, new items never get a chance
   * 
   * @param itemExposures - Times this item has been shown
   * @param totalExposures - Total times all items have been shown
   * @param maxBonus - Maximum bonus points (from config)
   * @returns Exploration bonus (0 to maxBonus points)
   */
  const calculateExplorationBonus = (itemExposures: number, totalExposures: number, maxBonus: number): number => {
    if (itemExposures === 0 || totalExposures === 0) return maxBonus // Max bonus for unexplored
    
    // UCB formula: sqrt(2 × ln(total) / item_exposures)
    const bonus = Math.sqrt((2 * Math.log(totalExposures + 1)) / itemExposures)
    return Math.min(bonus * 1.5, maxBonus) // Scale and cap at maxBonus
  }

  // ==================== CONSTANTS FOR STATISTICAL IMPROVEMENTS ====================
  // Using configurable values from feedbackConfig with sensible defaults
  const MINIMUM_ORDERS_THRESHOLD = scoringWeights.minimumOrders  // Don't trust data until X orders
  const NEUTRAL_HISTORICAL_SCORE = scoringWeights.historical / 2 // Half of max for insufficient data
  const MAX_EXPLORATION_BONUS = scoringWeights.explorationBonus  // Max UCB bonus points

  /**
   * Tiebreaker randomization for Day 0 position bias prevention
   * When items have equal scores, shuffle them to prevent position bias
   */
  const shuffleEqualScores = <T extends { score: number }>(items: T[]): T[] => {
    // Group items by score
    const scoreGroups = new Map<number, T[]>()
    items.forEach(entry => {
      const roundedScore = Math.round(entry.score * 100) / 100 // Round to avoid floating point issues
      if (!scoreGroups.has(roundedScore)) {
        scoreGroups.set(roundedScore, [])
      }
      scoreGroups.get(roundedScore)!.push(entry)
    })
    
    // Shuffle items within each score group (Fisher-Yates shuffle)
    const shuffleArray = <U,>(array: U[]): U[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    
    // Get sorted unique scores (descending) and rebuild array
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a)
    return sortedScores.flatMap(score => shuffleArray(scoreGroups.get(score)!))
  }

  const getRecommendedItems = (): MenuItem[] => {
    if (!selectedMood) return []
    
    const moodConfig = getMoodByValue(selectedMood)
    if (!moodConfig) return []

    // Get feedback config to check if baseline is reached
    const baselineReached = feedbackConfig?.feedbackEnabled || false
    const orderRateWeight = feedbackConfig?.orderRateWeight ?? 0.6
    const feedbackRateWeight = feedbackConfig?.feedbackRateWeight ?? 0.4
    
    // Ensure menuItems is an array
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : []
    
    // Start with all available items from API
    // CRITICAL: Exclude ADDON items from mood recommendations - they are extras, not main items
    // Excluded categories: if penalty=0, filter out; otherwise apply penalty in scoring
    const useExcludedCategoryPenalty = scoringWeights.excludedCategoryPenalty > 0
    const recommended = safeMenuItems.filter(item => {
      // Exclude ADDON items from mood recommendations - they are not main menu items
      if ((item as any).itemType === 'ADDON') return false
      // Only filter out excluded categories if penalty is 0 (default behavior)
      // Now uses categoryId for matching
      if (!useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.categoryId)) return false
      return item.available
    })

    // Calculate total exposures for exploration bonus (UCB)
    const totalExposures = Array.from(moodItemStats.values())
      .reduce((sum, stat) => sum + (stat.timesShown || 0), 0)

    // Score each item based on multiple factors using DYNAMIC weights from config
    const timeContext = getTimeContext()
    
    // DEBUG: Log scoring context
    console.log('\n🎯 ═══════════════════════════════════════════════════════════════')
    console.log(`📊 MOOD RECOMMENDATION SCORING - "${selectedMood.toUpperCase()}" mood`)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`⏰ Time: ${timeContext} | 🎚️ Baseline Reached: ${baselineReached}`)
    console.log(`📈 Total Exposures (for UCB): ${totalExposures}`)
    console.log(`⚖️ Weights: Benefits=${scoringWeights.moodBenefits}, Category=${scoringWeights.preferredCategory}, Historical=${scoringWeights.historical}, Featured=${scoringWeights.featured}, TimeOfDay=${scoringWeights.timeOfDay}, UCB=${scoringWeights.explorationBonus}`)
    console.log(`🔢 Min Orders Threshold: ${MINIMUM_ORDERS_THRESHOLD} | Excluded Cat Penalty: ${useExcludedCategoryPenalty ? `-${scoringWeights.excludedCategoryPenalty}` : 'FILTER OUT'}`)
    console.log('───────────────────────────────────────────────────────────────\n')
    
    const scoredItems = recommended.map(item => {
      let score = 0
      
      // Score breakdown for logging
      const breakdown = {
        moodBenefits: 0,
        preferredCategory: 0,
        excludedCategory: 0,
        historical: 0,
        featured: 0,
        timeOfDay: 0,
        explorationBonus: 0,
        stage: 'day0' as 'day0' | 'baseline' | 'post-baseline'
      }
      
      // ==================== 1. MOOD BENEFITS (+20 pts default) ====================
      // Items with scientific mood explanations get highest priority
      const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
      if (hasExplanation) {
        score += scoringWeights.moodBenefits
        breakdown.moodBenefits = scoringWeights.moodBenefits
      }
      
      // ==================== 2. PREFERRED CATEGORY (+10 pts default) ====================
      // Items in mood's preferred categories get boost (using categoryId)
      if (moodConfig.preferredCategories?.includes(item.categoryId)) {
        score += scoringWeights.preferredCategory
        breakdown.preferredCategory = scoringWeights.preferredCategory
      }
      
      // ==================== 2b. EXCLUDED CATEGORY PENALTY (configurable) ====================
      // If penalty > 0, apply negative points instead of filtering out (using categoryId)
      if (useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.categoryId)) {
        score -= scoringWeights.excludedCategoryPenalty
        breakdown.excludedCategory = -scoringWeights.excludedCategoryPenalty
      }
      
      // ==================== 3. HISTORICAL SUCCESS (0-15 pts, proportional) ====================
      // Uses Wilson Score for statistical confidence + Exploration Bonus for fairness
      const itemStats = moodItemStats.get(item.id)
      
      if (!itemStats || (itemStats.timesOrdered || 0) < MINIMUM_ORDERS_THRESHOLD) {
        // FIX #2: Not enough data yet → use neutral score (neither penalized nor boosted)
        // This prevents new items from being unfairly ranked at 0
        score += NEUTRAL_HISTORICAL_SCORE
        breakdown.historical = NEUTRAL_HISTORICAL_SCORE
        breakdown.stage = 'day0'
        
        // FIX #3: Add exploration bonus for items with little exposure
        const itemExposures = itemStats?.timesShown || 0
        const ucbBonus = calculateExplorationBonus(itemExposures, totalExposures, MAX_EXPLORATION_BONUS)
        score += ucbBonus
        breakdown.explorationBonus = ucbBonus
      } else {
        // Has sufficient data → use Wilson Score for statistical confidence
        
        // FIX #1: Use Wilson Score instead of raw percentage
        // This accounts for sample size uncertainty
        const orderRate = wilsonScore(
          itemStats.timesOrdered || 0, 
          itemStats.timesShown || 1
        )
        
        let historicalScore: number
        
        // FIX W3: Cap historical score at 2× neutral score to prevent runaway winners
        // Neutral = half of historical weight, so max cap = neutral × 2 = historical weight
        // But we limit to ~67% of weight to ensure new items can compete
        const HISTORICAL_CAP = NEUTRAL_HISTORICAL_SCORE * 2  // 2× neutral score
        
        if (!baselineReached) {
          // Before baseline: Use only order rate (100% weight)
          // Formula: historicalScore = wilsonScore(orderRate) × maxHistoricalPoints
          historicalScore = Math.min(orderRate * scoringWeights.historical, HISTORICAL_CAP)
          breakdown.stage = 'baseline'
        } else {
          // After baseline: Use combined formula with mood improvement
          // Formula: historicalScore = (wilsonScore(orderRate) × 60%) + (wilsonScore(improvementRate) × 40%)
          const improvementRate = itemStats.feedbackCount > 0
            ? wilsonScore(itemStats.moodImproved || 0, itemStats.feedbackCount)
            : 0
          
          const combinedRate = (orderRate * orderRateWeight) + (improvementRate * feedbackRateWeight)
          historicalScore = Math.min(combinedRate * scoringWeights.historical, HISTORICAL_CAP)
          breakdown.stage = 'post-baseline'
        }
        
        score += historicalScore
        breakdown.historical = historicalScore
        
        // FIX #3: Add exploration bonus even for established items (smaller bonus)
        const explorationBonus = calculateExplorationBonus(
          itemStats.timesShown || 1,
          totalExposures,
          MAX_EXPLORATION_BONUS
        )
        score += explorationBonus
        breakdown.explorationBonus = explorationBonus
      }
      
      // ==================== 4. FEATURED ITEMS (+5 pts default) ====================
      if (item.featured) {
        score += scoringWeights.featured
        breakdown.featured = scoringWeights.featured
      }
      
      // ==================== 5. TIME OF DAY (+5 pts default) ====================
      // Uses configurable categories from MoodSettings admin panel
      // FIX W6: Skip time bonus if item is in excluded category for current mood (using categoryId)
      const isExcludedForMood = moodConfig.excludeCategories?.includes(item.categoryId)
      
      // Only give time bonus if NOT in excluded categories (using categoryId)
      if (!isExcludedForMood) {
        if (timeContext === 'morning' && timeConfig.morningCategories.includes(item.categoryId)) {
          score += scoringWeights.timeOfDay
          breakdown.timeOfDay = scoringWeights.timeOfDay
        } else if (timeContext === 'afternoon' && timeConfig.afternoonCategories.includes(item.categoryId)) {
          score += scoringWeights.timeOfDay
          breakdown.timeOfDay = scoringWeights.timeOfDay
        } else if (timeContext === 'evening' && timeConfig.eveningCategories.includes(item.categoryId)) {
          score += scoringWeights.timeOfDay
          breakdown.timeOfDay = scoringWeights.timeOfDay
        }
      }
      
      return { item, score, hasExplanation, breakdown }
    })

    // Filter items: only show if they have mood benefits OR are in preferred category OR featured
    const filteredItems = scoredItems.filter(({ score, hasExplanation, item }) => {
      // Always show if has mood benefits
      if (hasExplanation) return true
      
      // Show items in preferred categories (using categoryId)
      if (moodConfig.preferredCategories?.includes(item.categoryId)) return true
      
      // Show featured items
      if (item.featured) return true
      
      // Show if score is above minimum threshold
      if (score >= scoringWeights.featured) return true
      
      return false
    })

    // FIX: Use tiebreaker shuffle to prevent Day 0 position bias
    // Items with equal scores get randomized to ensure fair exposure
    const shuffledItems = shuffleEqualScores(filteredItems)
    
    // DEBUG: Log detailed score breakdown for top items
    console.log('📋 ITEM SCORE BREAKDOWN (sorted by score):')
    console.log('┌────────────────────────────────────┬──────────┬─────────┬──────┬────────┬─────────┬──────────┬────────┬─────────┬─────────┐')
    console.log('│ Item Name                          │ Stage    │ Benefits│ Cat+ │ Cat-   │ History │ Featured │ TimeOD │ UCB     │ TOTAL   │')
    console.log('├────────────────────────────────────┼──────────┼─────────┼──────┼────────┼─────────┼──────────┼────────┼─────────┼─────────┤')
    
    shuffledItems.slice(0, 15).forEach(({ item, score, breakdown }, idx) => {
      const name = item.name.substring(0, 34).padEnd(34)
      const stage = breakdown.stage.padEnd(8)
      const benefits = breakdown.moodBenefits.toFixed(1).padStart(7)
      const catPlus = breakdown.preferredCategory.toFixed(1).padStart(4)
      const catMinus = breakdown.excludedCategory.toFixed(1).padStart(6)
      const hist = breakdown.historical.toFixed(2).padStart(7)
      const feat = breakdown.featured.toFixed(1).padStart(8)
      const time = breakdown.timeOfDay.toFixed(1).padStart(6)
      const ucb = breakdown.explorationBonus.toFixed(2).padStart(7)
      const total = score.toFixed(2).padStart(7)
      
      const rankEmoji = idx < 8 ? '✅' : '❌'
      console.log(`│ ${name} │ ${stage} │ ${benefits} │ ${catPlus} │ ${catMinus} │ ${hist} │ ${feat} │ ${time} │ ${ucb} │ ${total} │ ${rankEmoji}`)
    })
    
    console.log('└────────────────────────────────────┴──────────┴─────────┴──────┴────────┴─────────┴──────────┴────────┴─────────┴─────────┘')
    console.log(`\n✅ = In Top 8 (will be shown)  ❌ = Below top 8 (filtered out)`)
    console.log(`🎲 Randomization: Items with EQUAL scores are shuffled (tiebreaker) to prevent position bias`)
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    // Return top items (already sorted by score within shuffleEqualScores)
    let topRecommended = shuffledItems
      .slice(0, 8)
      .map(scored => scored.item)
    
    // Day 0 Position Shuffle: Randomize display order to prevent left-position bias
    // This is separate from score-based sorting - it's about UI position
    const shouldShufflePosition = feedbackConfig?.day0PositionShuffle ?? true
    if (shouldShufflePosition) {
      // Fisher-Yates shuffle for display order
      const shuffled = [...topRecommended]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      topRecommended = shuffled
      console.log('🔀 Day 0 Position Shuffle: Display order randomized to prevent left-position bias')
    }
    
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
      if (moodConfig.excludeCategories?.includes(item.categoryId)) return false
      return item.available
    })
    
    const scoredItems = recommended.map(item => {
      let score = 0
      const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
      if (hasExplanation) score += scoringWeights.moodBenefits
      if (moodConfig.preferredCategories?.includes(item.categoryId)) score += scoringWeights.preferredCategory
      if (item.featured) score += scoringWeights.featured
      // Time of day boost (using configurable categories with categoryId)
      if (timeContext === 'morning' && timeConfig.morningCategories.includes(item.categoryId)) {
        score += scoringWeights.timeOfDay
      } else if (timeContext === 'afternoon' && timeConfig.afternoonCategories.includes(item.categoryId)) {
        score += scoringWeights.timeOfDay
      } else if (timeContext === 'evening' && timeConfig.eveningCategories.includes(item.categoryId)) {
        score += scoringWeights.timeOfDay
      }
      return { item, score, hasExplanation }
    })
    
    const filteredItems = scoredItems.filter(({ score, hasExplanation, item }) => {
      if (hasExplanation) return true
      if (moodConfig.preferredCategories?.includes(item.categoryId)) return true
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
  
  // Filter by category - use categoryId for matching with API categories
  const filteredItems = selectedCategory === 'all' 
    ? safeMenuItems 
    : selectedCategory === 'best seller'
    ? safeMenuItems.filter(item => item.featured) // Use featured flag for best sellers
    : safeMenuItems.filter((item) => (item as any).categoryId === selectedCategory || item.category === selectedCategory.toLowerCase())
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
                  {recommendedItems.map((item, index) => (
                    <div key={item.id} className="shrink-0 relative" style={{ width: '140px' }}>
                      {/* Ranking badge (only shows if enabled in config) */}
                      {feedbackConfig?.showRankingNumbers && (
                        <div 
                          className={`absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          #{index + 1}
                        </div>
                      )}
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
              {/* Fixed All & Best Seller buttons */}
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="capitalize whitespace-nowrap"
                style={
                  selectedCategory === 'all'
                    ? { backgroundColor: '#F9C900', color: '#000000' }
                    : {}
                }
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'best seller' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('best seller')}
                className="capitalize whitespace-nowrap"
                style={
                  selectedCategory === 'best seller'
                    ? { backgroundColor: '#F9C900', color: '#000000' }
                    : {}
                }
              >
                Best Seller
              </Button>
              {/* Dynamic categories from API */}
              {categories.filter(cat => cat.isActive).map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="capitalize whitespace-nowrap"
                  style={
                    selectedCategory === category.id
                      ? { backgroundColor: '#F9C900', color: '#000000' }
                      : {}
                  }
                >
                  {category.displayName}
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
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

        {/* Addons & Variants Modal */}
        {showAddonsModal && selectedMenuItemForAddons && (
          <AddonsVariantsModal
            menuItem={selectedMenuItemForAddons as any}
            isOpen={showAddonsModal}
            onClose={() => {
              setShowAddonsModal(false)
              setSelectedMenuItemForAddons(null)
            }}
            onConfirm={(data) => {
              addItemWithAddonsToCart(data)
            }}
          />
        )}
      </div>
    </ClientLayout>
  )
}
