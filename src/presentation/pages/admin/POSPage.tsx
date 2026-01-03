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
import { useAuthStore } from '../../store/authStore'
import { recipeApi } from '../../../infrastructure/api/recipe.api'
import { useSettingsStore } from '../../store/settingsStore'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { generateReceiptHTML, generateKitchenReceiptHTML } from '../../../shared/utils/receiptTemplate'

// Helper to format order number - removes date prefix for cleaner display
const formatOrderNumber = (orderNumber: string): string => {
  const match = orderNumber.match(/ORD-\d{8}-(\d+)/)
  if (match) {
    return `ORD-${match[1]}`
  }
  return orderNumber
}

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
  const { user } = useAuthStore()
  const editingOrder = location.state?.editingOrder
  const reorderFrom = location.state?.reorderFrom
  const linkToOrder = location.state?.linkToOrder // New: Link to existing order (empty cart)
  const { markPaidOnConfirmOrder, markPaidOnPrintReceipt, printReceiptOnConfirmOrder, printKitchenCopy } = useSettingsStore()
  
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
  // For linkToOrder: start with empty cart; for reorderFrom: pre-fill items
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    linkToOrder ? [] : transformOrderItems((editingOrder?.items || reorderFrom?.items) || [])
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditMode] = useState(!!editingOrder)
  const [isReordering] = useState(!!reorderFrom)
  const [isLinkingOrder] = useState(!!linkToOrder) // New: Adding linked order
  // For linkToOrder: use the parent order's id; for reorderFrom: use its id
  const [linkedOrderId] = useState(linkToOrder?.id || reorderFrom?.id || null)
  const [maxServings, setMaxServings] = useState<Record<string, number>>({})
  
  // Order details state - pre-fill from linkToOrder, reorder or edit
  const [customerName, setCustomerName] = useState(
    editingOrder?.customerName || linkToOrder?.customerName || reorderFrom?.customerName || ''
  )
  const [tableNumber, setTableNumber] = useState(
    editingOrder?.tableNumber || linkToOrder?.tableNumber || reorderFrom?.tableNumber || ''
  )
  const [paymentMethod, setPaymentMethod] = useState(
    editingOrder?.paymentMethod || reorderFrom?.paymentMethod || 'CASH'
  )
  const [orderType, setOrderType] = useState(
    editingOrder?.orderType || linkToOrder?.orderType || reorderFrom?.orderType || 'DINE_IN'
  )

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Function to refresh max servings data (accounts for cart items with shared ingredients)
  const refreshMaxServings = async (cartItems?: OrderItem[]) => {
    try {
      const items = cartItems || orderItems
      if (items.length > 0) {
        // Use cart-aware endpoint for shared ingredient calculation
        const servingsData = await recipeApi.getMaxServingsWithCart(
          items.map(item => ({ menuItemId: item.menuItemId, quantity: item.quantity }))
        )
        setMaxServings(servingsData)
      } else {
        // No cart items, use regular endpoint
        const servingsData = await recipeApi.getAllMaxServings()
        setMaxServings(servingsData)
      }
    } catch (error) {
      console.error('Failed to refresh max servings:', error)
    }
  }

  // Refresh max servings when cart changes (for shared ingredient calculation)
  useEffect(() => {
    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      refreshMaxServings(orderItems)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [orderItems])

  // Fetch menu items and max servings from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true)
        const [response, servingsData] = await Promise.all([
          menuItemsApi.getAll({ available: true }),
          recipeApi.getAllMaxServings()
        ])
        
        // Convert API DTOs to MenuItem format
        const items: MenuItem[] = response.data.map((item: MenuItemDTO) => ({
          id: item.id,
          name: item.name,
          category: item.category.toLowerCase().replace('_', ' ') as MenuItem['category'],
          price: item.price,
          image: getImageUrl(item.image) || undefined,
          available: item.available,
          featured: item.featured
        }))
        setMenuItems(items)
        setMaxServings(servingsData)
      } catch (error) {
        console.error('Failed to fetch menu items:', error)
        alert('Failed to load menu items. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMenuItems()
  }, [])

  // Open cart automatically when editing or reordering
  useEffect(() => {
    if ((editingOrder || reorderFrom) && orderItems.length > 0) {
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

  const printReceiptForOrder = (order: any) => {
    const items = orderItems.length > 0 ? orderItems : order.order_items || []
    
    const receiptHTML = generateReceiptHTML({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      orderType: order.orderType || orderType,
      paymentMethod: order.paymentMethod || paymentMethod,
      items: items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.totalAmount
    })

    printWithIframe(receiptHTML)
  }

  const printReceipt = async () => {
    if (orderItems.length === 0) {
      alert('No items to print')
      return
    }

    // Handle edit mode - Mark Paid & Print: set PREPARING + PAID
    if (isEditMode && editingOrder) {
      try {
        // Update order details, set status to PREPARING and mark as PAID
        const updateData: any = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          status: 'PREPARING', // Set to PREPARING when confirming via Mark Paid & Print
          paymentStatus: 'PAID' // Mark as paid
        }
        
        await ordersApi.update(editingOrder.id, updateData)
        
        // Print the receipt with existing order data
        printReceiptForOrder(editingOrder)
        
        alert(`Order Confirmed, Paid & Preparing!\nOrder Number: ${editingOrder.orderNumber}`)
        
        // Clear order state and navigate back
        clearOrder()
        navigate('/admin/orders', { replace: true })
      } catch (error: any) {
        console.error('Failed to update order:', error)
        alert(`Failed to update order: ${error.response?.data?.error || error.message}`)
      }
      return
    }

    // Confirm the order first (save to database) for new orders
    try {
      const orderData = {
        customerName: customerName || undefined,
        tableNumber: tableNumber || undefined,
        orderType: orderType,
        paymentMethod: paymentMethod,
        linkedOrderId: linkedOrderId || undefined, // Link to original order if reordering
        createdBy: user?.role === 'MANAGER' ? 'Manager' : 'Cashier', // Track the role who created the order
        items: orderItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price
        }))
      }
      
      const createdOrder = await ordersApi.create(orderData)
      
      // Set status to PREPARING
      await ordersApi.update(createdOrder.id, { status: 'PREPARING' })
      
      // Refresh max servings to account for new PREPARING order
      await refreshMaxServings()
      
      // Mark as paid if setting is enabled
      if (markPaidOnPrintReceipt) {
        await ordersApi.update(createdOrder.id, { paymentStatus: 'PAID' })
      }
      
      // Clear the order after successful creation
      clearOrder()
      
      // Navigate back if reordering
      if (isReordering) {
        navigate('/admin/orders', { replace: true })
        return
      }
    } catch (error: any) {
      console.error('Failed to create order:', error)
      alert(`Failed to create order: ${error.response?.data?.error || error.message}`)
      return
    }

    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0)

    const receiptHTML = generateReceiptHTML({
      orderNumber: '', // Will be auto-generated or use existing
      createdAt: new Date().toISOString(),
      customerName: customerName || undefined,
      tableNumber: tableNumber || undefined,
      orderType: orderType,
      paymentMethod: paymentMethod,
      items: orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: total
    })

    printWithIframe(receiptHTML)

    // If kitchen copy setting is enabled, print a second receipt for kitchen
    if (printKitchenCopy) {
      setTimeout(() => {
        const kitchenReceiptHTML = generateKitchenReceiptHTML({
          orderType: orderType,
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity
          }))
        })
        printWithIframe(kitchenReceiptHTML)
      }, 500) // Small delay to allow first print to complete
    }
  }

  const confirmOrder = async () => {
    if (isEditMode && editingOrder) {
      // Update existing order and set status to PREPARING
      try {
        // Update order details and set status to PREPARING (cashier confirmed the order)
        const updateData: any = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          status: 'PREPARING' // Auto-set to PREPARING when cashier confirms edited order
        }
        
        await ordersApi.update(editingOrder.id, updateData)
        
        // Note: For a full implementation, you would need a backend endpoint 
        // to update order items. For now, we're only updating order metadata.
        
        // Show success message
        alert(`Order Confirmed & Now Preparing!\nOrder Number: ${editingOrder.orderNumber}`)
        
        // Clear order state
        clearOrder()
        
        // Navigate back to orders page
        navigate('/admin/orders', { replace: true })
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
          linkedOrderId: linkedOrderId || undefined, // Link to original order if linking or reordering
          createdBy: user?.role === 'MANAGER' ? 'Manager' : 'Cashier', // Track the role who created the order
          items: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price
          }))
        }
        
        console.log('Sending order data:', orderData)
        
        const createdOrder = await ordersApi.create(orderData)
        
        // Set status to PREPARING
        await ordersApi.update(createdOrder.id, { status: 'PREPARING' })
        
        // Refresh max servings to account for new PREPARING order
        await refreshMaxServings()
        
        // Mark as paid if setting is enabled
        if (markPaidOnConfirmOrder) {
          await ordersApi.update(createdOrder.id, { paymentStatus: 'PAID' })
        }
        
        // Auto-print receipt if setting is enabled
        if (printReceiptOnConfirmOrder) {
          printReceiptForOrder(createdOrder)
        }
        
        // Show success message with order number
        const successMsg = isLinkingOrder 
          ? `Linked Order Created!\nOrder Number: ${createdOrder.orderNumber}\nLinked to: ${linkToOrder?.orderNumber}\nTotal: ₱${createdOrder.totalAmount.toFixed(2)}`
          : `Order Created Successfully!\nOrder Number: ${createdOrder.orderNumber}\nTotal: ₱${createdOrder.totalAmount.toFixed(2)}`
        alert(successMsg)
        clearOrder()
        
        // Navigate to orders page if reordering or linking
        if (isReordering || isLinkingOrder) {
          navigate('/admin/orders', { replace: true })
        }
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

  // Sort items: available items first, out-of-stock at the bottom
  const sortedItems = [...searchFilteredItems].sort((a, b) => {
    const aOutOfStock = maxServings[a.id] === 0
    const bOutOfStock = maxServings[b.id] === 0
    if (aOutOfStock && !bOutOfStock) return 1  // a goes to bottom
    if (!aOutOfStock && bOutOfStock) return -1 // b goes to bottom
    return 0 // maintain original order
  })

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <AdminLayout hideHeaderOnDesktop>
      <div className="h-[calc(100vh-5rem)] lg:h-screen w-full max-w-full flex flex-col lg:flex-row gap-0 lg:gap-4 xl:gap-6 lg:p-4 xl:p-6 overflow-hidden">
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
          {/* Reorder Mode Banner */}
          {isReordering && (
            <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-medium">Reordering from: {reorderFrom?.orderNumber}</p>
                <p className="text-xs opacity-90">Original order - You can modify items before confirming</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/admin/orders')}
                className="bg-white text-green-600 border-white hover:bg-green-50 font-medium"
              >
                Cancel Reorder
              </Button>
            </div>
          )}
          {/* Link Order Mode Banner */}
          {isLinkingOrder && (
            <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-medium">🔗 Adding items to: {linkToOrder?.orderNumber}</p>
                <p className="text-xs opacity-90">This will create a linked order for {customerName || 'Guest'}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/admin/orders')}
                className="bg-white text-amber-600 border-white hover:bg-amber-50 font-medium"
              >
                Cancel
              </Button>
            </div>
          )}
          {/* Category Tabs */}
          <div className="bg-white border-b border-gray-200 p-3 lg:p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg lg:text-xl font-bold">
                {isEditMode ? 'Edit Order - Menu' : isReordering ? 'Reorder - Menu' : isLinkingOrder ? 'Add Items - Menu' : 'Menu'}
              </h2>
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
                  {sortedItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToOrder={addToOrder}
                      maxServings={maxServings[item.id]}
                    />
                  ))}
                </div>
                {sortedItems.length === 0 && (
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
            onPrintReceipt={printReceipt}
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
                onPrintReceipt={printReceipt}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
