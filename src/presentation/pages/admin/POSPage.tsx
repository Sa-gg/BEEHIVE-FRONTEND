import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem } from '../../../core/domain/entities/Order.entity'
import { MenuItemCard } from '../../components/features/POS/MenuItemCard'
import { OrderSummary } from '../../components/features/POS/OrderSummary'
import { Button } from '../../components/common/ui/button'
import { ShoppingCart, Search } from 'lucide-react'

// Sample menu data - In production, this would come from your backend
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

export const POSPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const editingOrder = location.state?.editingOrder
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>(editingOrder?.items || [])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(!!editingOrder)

  // Open cart automatically when editing an order
  useEffect(() => {
    if (editingOrder && orderItems.length > 0) {
      setIsCartOpen(true)
    }
  }, [])

  const addToOrder = (menuItem: MenuItem) => {
    setOrderItems((prev) => {
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
    
    setOrderItems((prev) =>
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
    setOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId))
  }

  const clearOrder = () => {
    setOrderItems([])
  }

  const confirmOrder = () => {
    if (isEditMode && editingOrder) {
      // Return to orders page with updated items
      navigate('/admin/orders', { 
        state: { 
          updatedOrder: {
            ...editingOrder,
            items: orderItems,
            totalAmount: orderItems.reduce((sum, item) => sum + item.subtotal, 0)
          }
        }
      })
    } else {
      // In production, this would save the order to the backend
      alert(`Order confirmed!\nTotal: ₱${(orderItems.reduce((sum, item) => sum + item.subtotal, 0) * 1.12).toFixed(2)}`)
      clearOrder()
    }
  }

  const cancelEdit = () => {
    navigate('/admin/orders')
  }

  const filteredItems = selectedCategory === 'all' 
    ? MENU_ITEMS 
    : selectedCategory === 'best seller'
    ? MENU_ITEMS.filter(item => BEST_SELLER_IDS.includes(item.id))
    : MENU_ITEMS.filter((item) => item.category === selectedCategory)

  // Apply search filter
  const searchFilteredItems = searchQuery.trim() 
    ? filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <AdminLayout hideHeader>
      <div className="h-screen w-full max-w-full flex flex-col lg:flex-row gap-0 lg:gap-4 xl:gap-6 lg:p-4 xl:p-6 overflow-hidden">
        {/* Left Side - Menu - Full screen on mobile */}
        <div className="flex-1 flex flex-col bg-gray-50 lg:rounded-lg lg:shadow-lg lg:border lg:border-gray-200 min-h-0 min-w-0 overflow-hidden">
          {/* Edit Mode Banner */}
          {isEditMode && (
            <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-medium">Editing Order: {editingOrder?.orderNumber}</p>
                <p className="text-xs opacity-90">Customer: {editingOrder?.customerName}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEdit}
                className="text-white border-white hover:bg-white/20"
              >
                Cancel Edit
              </Button>
            </div>
          )}
          {/* Category Tabs */}
          <div className="bg-white border-b border-gray-200 p-3 lg:p-4 flex-shrink-0 pt-16 lg:pt-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg lg:text-xl font-bold">{isEditMode ? 'Edit Order - Menu' : 'Menu'}</h2>
              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs ml-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 lg:mx-0 lg:px-0">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize whitespace-nowrap text-xs lg:text-sm flex-shrink-0"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0 pb-24 lg:pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-3">
              {searchFilteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddToOrder={addToOrder}
                />
              ))}
            </div>
            {searchFilteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search className="h-16 w-16 mb-4" />
                <p className="text-sm">No items found</p>
                {searchQuery && (
                  <p className="text-xs mt-2">Try a different search term</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop - Order Summary Sidebar */}
        <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <OrderSummary
            items={orderItems}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onClearOrder={clearOrder}
            onConfirmOrder={confirmOrder}
          />
        </div>

        {/* Mobile - Floating Cart Button */}
        {totalItems > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform hover:scale-110"
            style={{ backgroundColor: '#F9C900' }}
          >
            <ShoppingCart className="h-7 w-7 text-black" />
            <span
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#000000' }}
            >
              {totalItems}
            </span>
          </button>
        )}

        {/* Mobile - Cart Drawer */}
        {isCartOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsCartOpen(false)}
            />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
              <OrderSummary
                items={orderItems}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onClearOrder={clearOrder}
                onConfirmOrder={() => {
                  confirmOrder()
                  setIsCartOpen(false)
                }}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
