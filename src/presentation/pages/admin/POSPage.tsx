import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem } from '../../../core/domain/entities/Order.entity'
import { MenuItemCard } from '../../components/features/POS/MenuItemCard'
import { OrderSummary } from '../../components/features/POS/OrderSummary'
import { Button } from '../../components/common/ui/button'
import { ShoppingCart, Search, Loader2 } from 'lucide-react'
import { menuItemsApi, type MenuItemDTO } from '../../../infrastructure/api/menuItems.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'

const CATEGORIES = ['all', 'best seller', 'PIZZA', 'APPETIZER', 'HOT_DRINKS', 'COLD_DRINKS', 'SMOOTHIE', 'PLATTER', 'SAVERS', 'VALUE_MEAL'] as const

const CATEGORY_LABELS: Record<string, string> = {
  'all': 'All',
  'best seller': 'Best Seller',
  'PIZZA': 'Pizza',
  'APPETIZER': 'Appetizer',
  'HOT_DRINKS': 'Hot Drinks',
  'COLD_DRINKS': 'Cold Drinks',
  'SMOOTHIE': 'Smoothie',
  'PLATTER': 'Platter',
  'SAVERS': 'Savers',
  'VALUE_MEAL': 'Value Meal'
}

export const POSPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const editingOrder = location.state?.editingOrder
  
  // Transform order items from backend format to POS format
  const transformOrderItems = (items: any[]): OrderItem[] => {
    if (!items) return []
    return items.map(item => ({
      menuItemId: item.menuItemId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal || (item.price * item.quantity)
    }))
  }
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orderItems, setOrderItems] = useState<OrderItem[]>(transformOrderItems(editingOrder?.items || []))
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(!!editingOrder)
  
  // Order details state
  const [customerName, setCustomerName] = useState(editingOrder?.customerName || '')
  const [tableNumber, setTableNumber] = useState(editingOrder?.tableNumber || '')
  const [paymentMethod, setPaymentMethod] = useState(editingOrder?.paymentMethod || 'CASH')
  const [orderType, setOrderType] = useState(editingOrder?.orderType || 'DINE_IN')

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true)
        const response = await menuItemsApi.getAll({ available: true })
        // Convert API DTOs to MenuItem format
        const items: MenuItem[] = response.data.map((item: MenuItemDTO) => ({
          id: item.id,
          name: item.name,
          category: item.category.toLowerCase().replace('_', ' '),
          price: item.price,
          image: getImageUrl(item.image),
          available: item.available,
          featured: item.featured
        }))
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to fetch menu items:', error)
        alert('Failed to load menu items. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMenuItems()
  }, [])

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
    setCustomerName('')
    setTableNumber('')
    setPaymentMethod('CASH')
    setOrderType('DINE_IN')
  }

  const confirmOrder = async () => {
    if (isEditMode && editingOrder) {
      // Update order by deleting old and creating new with same order number
      try {
        // Delete the old order
        await ordersApi.delete(editingOrder.id)
        
        // Create new order with updated items
        const orderData = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          items: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price
          }))
        }
        
        const updatedOrder = await ordersApi.create(orderData)
        
        // Show success message
        alert(`Order Updated Successfully!\nOrder Number: ${updatedOrder.orderNumber}\nTotal: ₱${updatedOrder.totalAmount.toFixed(2)}`)
        
        // Navigate back to orders page
        navigate('/admin/orders')
      } catch (error: any) {
        console.error('Failed to update order:', error)
        alert(`Failed to update order: ${error.response?.data?.error || error.message}`)
      }
    } else {
      // Create order via API
      try {
        const orderData = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          items: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price
          }))
        }
        
        console.log('Sending order data:', orderData)
        
        const createdOrder = await ordersApi.create(orderData)
        
        // Show success message with order number
        alert(`Order Created Successfully!\nOrder Number: ${createdOrder.orderNumber}\nTotal: ₱${createdOrder.totalAmount.toFixed(2)}`)
        clearOrder()
        
        // Optionally navigate to orders page
        // navigate('/admin/orders')
      } catch (error: any) {
        console.error('Failed to create order:', error)
        console.error('Error response:', error.response?.data)
        alert(`Failed to create order: ${error.response?.data?.error || error.message}`)
      }
    }
  }

  const cancelEdit = () => {
    navigate('/admin/orders')
  }

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : selectedCategory === 'best seller'
    ? menuItems.filter(item => item.featured)
    : menuItems.filter((item) => item.category === selectedCategory.toLowerCase().replace('_', ' '))

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
                className="bg-white text-blue-600 border-white hover:bg-blue-50 font-medium"
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
                  {CATEGORY_LABELS[category] || category}
                </Button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0 pb-24 lg:pb-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-500">Loading menu items...</p>
                </div>
              </div>
            ) : (
              <>
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
                  <div className="text-center py-12">
                    <p className="text-gray-500">No items found</p>
                    {searchQuery && (
                      <p className="text-xs mt-2 text-gray-400">Try a different search term</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Desktop - Order Summary Sidebar */}
        <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <OrderSummary
            items={orderItems}
            customerName={customerName}
            tableNumber={tableNumber}
            paymentMethod={paymentMethod}
            orderType={orderType}
            onCustomerNameChange={setCustomerName}
            onTableNumberChange={setTableNumber}
            onPaymentMethodChange={setPaymentMethod}
            onOrderTypeChange={setOrderType}
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
                customerName={customerName}
                tableNumber={tableNumber}
                paymentMethod={paymentMethod}
                orderType={orderType}
                onCustomerNameChange={setCustomerName}
                onTableNumberChange={setTableNumber}
                onPaymentMethodChange={setPaymentMethod}
                onOrderTypeChange={setOrderType}
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
