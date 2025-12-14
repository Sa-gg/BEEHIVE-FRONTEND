import { useState, useEffect } from 'react'
import { ClientLayout } from '../../components/layout/ClientLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem } from '../../../core/domain/entities/Order.entity'
import type { CustomerOrder } from '../../../core/domain/entities/CustomerOrder.entity'
import type { MoodType } from '../../../shared/utils/moodSystem'
import { getMoodByValue, getTimeContext, getWeatherContext, analyzeMoodEffectiveness } from '../../../shared/utils/moodSystem'
import { getMoodExplanation } from '../../../shared/utils/nutritionalBenefits'
import { CustomerMenuItemCard } from '../../components/features/CustomerMenu/CustomerMenuItemCard'
import { CartDrawer } from '../../components/features/CustomerMenu/CartDrawer'
import { CheckoutForm } from '../../components/features/CustomerMenu/CheckoutForm'
import { OrderConfirmation } from '../../components/features/CustomerMenu/OrderConfirmation'
import { MoodSelector } from '../../components/features/CustomerMenu/MoodSelector'
import { MoodReflectionModal } from '../../components/features/CustomerMenu/MoodReflectionModal'
import { CustomerDropdown } from '../../components/features/CustomerMenu/CustomerDropdown'
import { MyOrdersModal } from '../../components/features/CustomerMenu/MyOrdersModal'
import { Button } from '../../components/common/ui/button'
import { ShoppingBag, Sparkles, Loader2 } from 'lucide-react'
import { generateOrderNumber } from '../../../shared/utils/orderUtils'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { useAuthStore } from '../../store/authStore'

const CATEGORIES = ['all', 'best seller', 'pizza', 'appetizer', 'hot drinks', 'cold drinks', 'smoothie', 'platter', 'savers', 'value meal'] as const

type ViewState = 'menu' | 'checkout' | 'confirmation'

export const MenuPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  
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

  // Fetch menu items on mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setIsLoading(true)
        const response = await menuItemsApi.getAll()
        // API returns { success, data }, so we need response.data
        const items = Array.isArray(response) ? response : response.data || []
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to fetch menu items:', error)
        setMenuItems([]) // Ensure it's always an array
      } finally {
        setIsLoading(false)
      }
    }
    fetchMenuItems()
  }, [])

  // Scroll to top when component mounts or mood changes from URL
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const currentMood = selectedMood ? getMoodByValue(selectedMood) : null
  const timeContext = getTimeContext()
  const weatherContext = getWeatherContext()

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

  const handleSubmitOrder = async (data: { customerName: string; tableNumber: string; notes: string; orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY' }) => {
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
    } catch (error) {
      console.error('Failed to submit order:', error)
      alert('Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectMood = (mood: MoodType) => {
    setSelectedMood(mood)
    setShowMoodSelector(false)
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

    // Score each item based on multiple factors
    const scoredItems = recommended.map(item => {
      let score = 0
      
      // HISTORICAL ORDER-BASED SCORE (10 points max)
      // Parse moodOrderStats from database
      if (item.moodOrderStats) {
        try {
          const stats = typeof item.moodOrderStats === 'string' 
            ? JSON.parse(item.moodOrderStats) 
            : item.moodOrderStats
          
          if (stats[selectedMood]) {
            const { shown, ordered } = stats[selectedMood]
            if (shown > 0) {
              // Order rate: percentage of times customers chose this when shown
              const orderRate = ordered / shown
              score += orderRate * 10 // Convert to 0-10 score
            }
          }
        } catch (e) {
          console.error('Error parsing moodOrderStats:', e)
        }
      }
      
      // HIGHEST PRIORITY: Boost items with scientific explanations for this mood (20 points)
      // Pass moodBenefits from database to getMoodExplanation
      const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
      if (hasExplanation) {
        score += 20
      }
      
      // Preferred categories get high score (10 points)
      if (moodConfig.preferredCategories?.includes(item.category)) {
        score += 10
      }
      
      // Items from successful past orders get bonus (15 points)
      if (topItems.includes(item.name)) {
        score += 15
      }
      
      // Context-based scoring (5 points each)
      if (timeContext === 'morning' && (item.category === 'hot drinks' || item.category === 'appetizer')) {
        score += 5
      } else if ((timeContext === 'evening' || timeContext === 'night') && 
                 (item.category === 'pizza' || item.category === 'platter' || item.category === 'value meal')) {
        score += 5
      }
      
      if (weatherContext === 'hot' && (item.category === 'cold drinks' || item.category === 'smoothie')) {
        score += 5
      } else if (weatherContext === 'cold' && item.category === 'hot drinks') {
        score += 5
      }
      
      return { item, score }
    })

    // Sort by score and return top items
    const topRecommended = scoredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(scored => scored.item)
    
    // Track that these items were shown for this mood
    if (topRecommended.length > 0) {
      const itemIds = topRecommended.map(item => item.id)
      menuItemsApi.trackMoodViews(itemIds, selectedMood).catch(err => {
        console.error('Failed to track mood views:', err)
      })
    }
    
    return topRecommended
  }

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
  
  // Convert display category to database format (e.g., 'hot drinks' -> 'HOT_DRINKS')
  const categoryToDbFormat = (category: string): string => {
    return category.toUpperCase().replace(/ /g, '_')
  }
  
  const filteredItems = selectedCategory === 'all' 
    ? safeMenuItems 
    : selectedCategory === 'best seller'
    ? safeMenuItems.filter(item => item.featured) // Use featured flag for best sellers
    : safeMenuItems.filter((item) => item.category === categoryToDbFormat(selectedCategory))
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
                  src="/src/assets/logo.png" 
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
        />
      </div>
    </ClientLayout>
  )
}
