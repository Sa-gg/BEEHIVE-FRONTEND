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
import { Button } from '../../components/common/ui/button'
import { ShoppingBag, Sparkles } from 'lucide-react'
import { generateOrderNumber } from '../../../shared/utils/orderUtils'
import { useSearchParams } from 'react-router-dom'

// Sample menu data - same as POS
const MENU_ITEMS: MenuItem[] = [
  // Pizza
  { id: '1', name: 'Bacon Pepperoni', category: 'pizza', price: 299, image: '/src/assets/pizza/Bacon Pepperoni.jpg', available: true },
  { id: '2', name: 'Beef Wagon', category: 'pizza', price: 329, image: '/src/assets/pizza/beef wagon.jpg', available: true },
  { id: '3', name: 'Creamy Spinach', category: 'pizza', price: 279, image: '/src/assets/pizza/Creamy Spinach.jpg', available: true },
  { id: '4', name: 'Ham & Cheese Hawaiian', category: 'pizza', price: 289, image: '/src/assets/pizza/Ham & Cheese Hawaiian.jpg', available: true },
  
  // Appetizers
  { id: '5', name: 'Beef Burger', category: 'appetizer', price: 149, image: '/src/assets/appetizer/Beef Burger.jpg', available: true },
  { id: '6', name: 'Chicken Burger', category: 'appetizer', price: 139, image: '/src/assets/appetizer/Chicken Burger.jpg', available: true },
  { id: '7', name: 'Burger w/ Fries', category: 'appetizer', price: 179, image: '/src/assets/appetizer/Burger w Fries.jpg', available: true },
  { id: '8', name: 'Cheesy Fries', category: 'appetizer', price: 99, image: '/src/assets/appetizer/Cheesy Fries.jpg', available: true },
  { id: '9', name: 'Chili Fries', category: 'appetizer', price: 109, image: '/src/assets/appetizer/chili fries.jpg', available: true },
  { id: '10', name: 'Meaty Chili Fries', category: 'appetizer', price: 129, image: '/src/assets/appetizer/Meaty Chili Fries.jpg', available: true },
  { id: '11', name: 'Meaty Fries', category: 'appetizer', price: 119, image: '/src/assets/appetizer/meaty fries.jpg', available: true },
  { id: '12', name: 'Nacho Fries', category: 'appetizer', price: 139, image: '/src/assets/appetizer/Nacho Fries.png', available: true },
  { id: '13', name: 'Nachos', category: 'appetizer', price: 159, image: '/src/assets/appetizer/Nachos.jpg', available: true },
  { id: '14', name: 'Lumpia Shanghai', category: 'appetizer', price: 89, image: '/src/assets/appetizer/Lumpia Shanghai.jpg', available: true },
  { id: '15', name: 'Pancit Canton Chili Mansi', category: 'appetizer', price: 39, image: '/src/assets/appetizer/Pancit Canton Chili Mansi.jpg', available: true },
  { id: '16', name: 'Pancit Canton Extra Hot', category: 'appetizer', price: 39, image: '/src/assets/appetizer/Pancit Canton Extra Hot.jpg', available: true },
  
  // Hot Drinks
  { id: '17', name: 'Hot Coffee', category: 'hot drinks', price: 79, image: '/src/assets/hot drinks/hot coffee.png', available: true },
  { id: '18', name: 'Hot Coffee with Milk', category: 'hot drinks', price: 89, image: '/src/assets/hot drinks/hot coffee with millk.png', available: true },
  { id: '19', name: 'Hot Chocolate', category: 'hot drinks', price: 99, image: '/src/assets/hot drinks/hot chocolate.png', available: true },
  { id: '20', name: 'Hot Matcha', category: 'hot drinks', price: 109, image: '/src/assets/hot drinks/hot matcha.png', available: true },
  
  // Cold Drinks
  { id: '21', name: 'Caramel Macchiato', category: 'cold drinks', price: 119, image: '/src/assets/cold drinks/caramel machiato.png', available: true },
  { id: '22', name: 'Caramel Matcha', category: 'cold drinks', price: 129, image: '/src/assets/cold drinks/caramel matahca.png', available: true },
  { id: '23', name: 'Dirty Matcha Latte', category: 'cold drinks', price: 139, image: '/src/assets/cold drinks/dirty matcha latte.png', available: true },
  { id: '24', name: 'Iced Americano', category: 'cold drinks', price: 99, image: '/src/assets/cold drinks/iced americano.png', available: true },
  { id: '25', name: 'Iced Caramel Milk', category: 'cold drinks', price: 109, image: '/src/assets/cold drinks/iced caramel milk.png', available: true },
  { id: '26', name: 'Iced Chocolate', category: 'cold drinks', price: 109, image: '/src/assets/cold drinks/iced chocolate.png', available: true },
  { id: '27', name: 'Iced Coffee', category: 'cold drinks', price: 89, image: '/src/assets/cold drinks/iced coffee.png', available: true },
  { id: '28', name: 'Iced Matcha', category: 'cold drinks', price: 119, image: '/src/assets/cold drinks/iceed matcha.png', available: true },
  { id: '29', name: 'Salted Caramel', category: 'cold drinks', price: 129, image: '/src/assets/cold drinks/salted caramel.png', available: true },
  { id: '30', name: 'Spanish Latte', category: 'cold drinks', price: 119, image: '/src/assets/cold drinks/spanish latte.png', available: true },
  
  // Smoothies
  { id: '31', name: 'Blueberry Smoothie', category: 'smoothie', price: 149, image: '/src/assets/smoothie/blueberry.png', available: true },
  { id: '32', name: 'Strawberry Smoothie', category: 'smoothie', price: 149, image: '/src/assets/smoothie/strawberry.png', available: true },
  
  // Platter
  { id: '33', name: 'Beef Tapa', category: 'platter', price: 189, image: '/src/assets/platter/beeftapa.jpg', available: true },
  { id: '34', name: 'Boneless Bangus', category: 'platter', price: 179, image: '/src/assets/platter/bonelessbangus.webp', available: true },
  { id: '35', name: 'Chicharon Bulaklak', category: 'platter', price: 199, image: '/src/assets/platter/chicharonbulaklak.jpg', available: true },
  { id: '36', name: 'Hungarian', category: 'platter', price: 159, image: '/src/assets/platter/hungarian.jpg', available: true },
  { id: '37', name: 'Hungarian w/ Fries', category: 'platter', price: 189, image: '/src/assets/platter/hungarianwfries.jpg', available: true },
  { id: '38', name: 'Pork Sisig', category: 'platter', price: 169, image: '/src/assets/platter/porksisig.png', available: true },
  
  // Savers
  { id: '39', name: 'Beef Tapa', category: 'savers', price: 129, image: '/src/assets/savers/beef tapa.jpg', available: true },
  { id: '40', name: 'Burger Steak', category: 'savers', price: 119, image: '/src/assets/savers/burger steak.png', available: true },
  { id: '41', name: 'Cheesy Hungarian', category: 'savers', price: 109, image: '/src/assets/savers/cheesy hungarian.png', available: true },
  { id: '42', name: 'Chicken Fillet', category: 'savers', price: 119, image: '/src/assets/savers/chicken fillet.png', available: true },
  { id: '43', name: 'Fish Fillet', category: 'savers', price: 119, image: '/src/assets/savers/fishfillet.png', available: true },
  { id: '44', name: 'Fried Liempo', category: 'savers', price: 129, image: '/src/assets/savers/fried liempo.png', available: true },
  { id: '45', name: 'Garlic Pepper Beef', category: 'savers', price: 139, image: '/src/assets/savers/garlic pepper beef.png', available: true },
  { id: '46', name: 'Grilled Liempo', category: 'savers', price: 129, image: '/src/assets/savers/grilled liempo.jpg', available: true },
  { id: '47', name: 'Pork Sisig', category: 'savers', price: 119, image: '/src/assets/savers/pork sisig.jpg', available: true },
  
  // Value Meal
  { id: '48', name: 'Boneless Bangus', category: 'value meal', price: 159, image: '/src/assets/value meal/Boneless Bangus.jpg', available: true },
  { id: '49', name: 'Chicharon Bulaklak', category: 'value meal', price: 179, image: '/src/assets/value meal/chicharon bulaklak.png', available: true },
  { id: '50', name: 'Hungarian', category: 'value meal', price: 149, image: '/src/assets/value meal/hungarian.png', available: true },
  { id: '51', name: 'Pork BBQ Grilled', category: 'value meal', price: 169, image: '/src/assets/value meal/Pork BBQ Grilled.jpg', available: true },
  { id: '52', name: 'Spare Ribs', category: 'value meal', price: 189, image: '/src/assets/value meal/spareribs.jpg', available: true },
]

const BEST_SELLER_IDS = ['1', '2', '13', '14', '33', '40']

const CATEGORIES = ['all', 'best seller', 'pizza', 'appetizer', 'hot drinks', 'cold drinks', 'smoothie', 'platter', 'savers', 'value meal'] as const

type ViewState = 'menu' | 'checkout' | 'confirmation'

export const MenuPage = () => {
  const [searchParams] = useSearchParams()
  
  // Initialize selectedMood from URL parameter
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(() => {
    const moodParam = searchParams.get('mood') as MoodType | null
    return (moodParam && getMoodByValue(moodParam)) ? moodParam : null
  })
  
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [viewState, setViewState] = useState<ViewState>('menu')
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null)
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [showMoodReflection, setShowMoodReflection] = useState(false)
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null)

  // Scroll to top when component mounts or mood changes from URL
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const currentMood = selectedMood ? getMoodByValue(selectedMood) : null
  const timeContext = getTimeContext()
  const weatherContext = getWeatherContext()

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

  const handleSubmitOrder = (data: { customerName: string; tableNumber: string; notes: string }) => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = subtotal * 0.12
    const total = subtotal + tax

    const order: CustomerOrder = {
      id: Date.now().toString(),
      orderNumber: generateOrderNumber(),
      items: cartItems,
      subtotal,
      tax,
      total,
      status: 'pending',
      customerName: data.customerName || undefined,
      tableNumber: data.tableNumber || undefined,
      notes: data.notes || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setConfirmedOrder(order)
    setViewState('confirmation')
    
    // Store order in localStorage for demo purposes
    const existingOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]')
    localStorage.setItem('customerOrders', JSON.stringify([...existingOrders, order]))

    // Show mood reflection if mood was selected
    if (selectedMood) {
      setTimeout(() => {
        setShowMoodReflection(true)
      }, 2000)
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
    
    // Start with all available items
    const recommended = MENU_ITEMS.filter(item => {
      // Exclude categories based on mood (e.g., no cold drinks for sad mood)
      if (moodConfig.excludeCategories?.includes(item.category)) return false
      return item.available
    })

    // Score each item based on multiple factors
    const scoredItems = recommended.map(item => {
      let score = 0
      
      // HIGHEST PRIORITY: Boost items with scientific explanations for this mood
      const hasExplanation = getMoodExplanation(item.name, selectedMood)
      if (hasExplanation) {
        score += 20 // Prioritize items that can show scientific mood benefits
      }
      
      // Preferred categories get high score
      if (moodConfig.preferredCategories?.includes(item.category)) {
        score += 10
      }
      
      // Items from successful past orders get bonus
      if (topItems.includes(item.name)) {
        score += 15
      }
      
      // Context-based scoring
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
    return scoredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(scored => scored.item)
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

  const filteredItems = selectedCategory === 'all' 
    ? MENU_ITEMS 
    : selectedCategory === 'best seller'
    ? MENU_ITEMS.filter(item => BEST_SELLER_IDS.includes(item.id))
    : MENU_ITEMS.filter((item) => item.category === selectedCategory)
  const recommendedItems = getRecommendedItems()
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (viewState === 'checkout') {
    return (
      <CheckoutForm
        items={cartItems}
        onSubmit={handleSubmitOrder}
        onBack={handleBackToMenu}
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
              <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-12 w-12 object-contain" />
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
                      <CustomerMenuItemCard item={item} onAddToCart={addToCart} currentMood={selectedMood} compact />
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
                  {MENU_ITEMS.filter(item => BEST_SELLER_IDS.includes(item.id)).map((item) => (
                    <div key={item.id} className="shrink-0" style={{ width: '140px' }}>
                      <CustomerMenuItemCard item={item} onAddToCart={addToCart} currentMood={selectedMood} compact />
                    </div>
                  ))}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <CustomerMenuItemCard
                key={item.id}
                item={item}
                onAddToCart={addToCart}
                currentMood={selectedMood}
              />
            ))}
          </div>
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
      </div>
    </ClientLayout>
  )
}
