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
import { categoriesApi, type CategoryDTO } from '../../../infrastructure/api/categories.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { useAuthStore } from '../../store/authStore'
import { recipeApi } from '../../../infrastructure/api/recipe.api'
import { useSettingsStore } from '../../store/settingsStore'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { generateReceiptHTML, generateKitchenReceiptHTML } from '../../../shared/utils/receiptTemplate'
import { CashCalculatorModal } from '../../components/common/CashCalculatorModal'
import { FeeInputModal, type FeeType } from '../../components/common/FeeInputModal'
import { toast } from '../../components/common/ToastNotification'

// Helper to format order number - removes date prefix for cleaner display
const formatOrderNumber = (orderNumber: string): string => {
  const match = orderNumber.match(/ORD-\d{8}-(\d+)/)
  if (match) {
    return `ORD-${match[1]}`
  }
  return orderNumber
}

export const POSPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const editingOrder = location.state?.editingOrder
  const reorderFrom = location.state?.reorderFrom
  const linkToOrder = location.state?.linkToOrder // New: Link to existing order (empty cart)
  const addToTab = location.state?.addToTab // New: Add items to existing tab order
  const { markPaidOnPrintReceipt, printKitchenCopy, printKitchenCopyForOpenTab, cashChangeEnabled, posMobileColumnsPerRow, posMobileCardSize, autoOutOfStockWhenIngredientsRunOut } = useSettingsStore()
  
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
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  // For linkToOrder/addToTab: start with empty cart; for reorderFrom: pre-fill items
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    linkToOrder || addToTab ? [] : transformOrderItems((editingOrder?.items || reorderFrom?.items) || [])
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditMode] = useState(!!editingOrder)
  const [isReordering] = useState(!!reorderFrom)
  const [isLinkingOrder] = useState(!!linkToOrder) // New: Adding linked order
  const [isAddingToTab] = useState(!!addToTab) // New: Adding items to existing tab order
  // For linkToOrder: use the parent order's id; for reorderFrom: use its id
  const [linkedOrderId] = useState(linkToOrder?.id || reorderFrom?.id || null)
  const [tabOrderId] = useState(addToTab?.id || null) // Tab order ID for adding items
  const [maxServings, setMaxServings] = useState<Record<string, number>>({})
  
  // Order details state - pre-fill from addToTab, linkToOrder, reorder or edit
  const [customerName, setCustomerName] = useState(
    editingOrder?.customerName || addToTab?.customerName || linkToOrder?.customerName || reorderFrom?.customerName || ''
  )
  const [tableNumber, setTableNumber] = useState(
    editingOrder?.tableNumber || addToTab?.tableNumber || linkToOrder?.tableNumber || reorderFrom?.tableNumber || ''
  )
  const [paymentMethod, setPaymentMethod] = useState(
    editingOrder?.paymentMethod || reorderFrom?.paymentMethod || 'CASH'
  )
  const [orderType, setOrderType] = useState(
    editingOrder?.orderType || addToTab?.orderType || linkToOrder?.orderType || reorderFrom?.orderType || 'DINE_IN'
  )

  // Fees and discount state
  const [deliveryFee, setDeliveryFee] = useState(editingOrder?.deliveryFee || 0)
  const [serviceFee, setServiceFee] = useState(editingOrder?.serviceFee || 0)
  const [discountAmount, setDiscountAmount] = useState(editingOrder?.discountAmount || 0)
  
  // Modal states
  const [showCashModal, setShowCashModal] = useState(false)
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [currentFeeType, setCurrentFeeType] = useState<FeeType>('delivery')
  const [pendingAction, setPendingAction] = useState<'confirm' | 'print' | null>(null)

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

  // Fetch menu items, categories and max servings from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [menuResponse, categoriesResponse, servingsData] = await Promise.all([
          menuItemsApi.getAll({ available: true }),
          categoriesApi.getAll(),
          recipeApi.getAllMaxServings()
        ])
        
        // Set categories
        setCategories(categoriesResponse.data)
        
        // Convert API DTOs to MenuItem format
        const items: MenuItem[] = menuResponse.data.map((item: MenuItemDTO) => ({
          id: item.id,
          name: item.name,
          // Use categoryId for filtering, but display category name
          categoryId: item.categoryId,
          category: (item.category?.displayName || item.category?.name || '').toLowerCase().replace('_', ' ') as MenuItem['category'],
          price: item.price,
          image: getImageUrl(item.image) || undefined,
          available: item.available,
          featured: item.featured
        }))
        setMenuItems(items)
        setMaxServings(servingsData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load menu items', 'Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
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
    setDeliveryFee(0)
    setServiceFee(0)
    setDiscountAmount(0)
  }

  // Fee modal handlers
  const handleDeliveryFeeClick = () => {
    setCurrentFeeType('delivery')
    setShowFeeModal(true)
  }

  const handleServiceFeeClick = () => {
    setCurrentFeeType('service')
    setShowFeeModal(true)
  }

  const handleDiscountClick = () => {
    setCurrentFeeType('discount')
    setShowFeeModal(true)
  }

  const handleFeeConfirm = (amount: number) => {
    if (currentFeeType === 'delivery') {
      setDeliveryFee(amount)
    } else if (currentFeeType === 'service') {
      setServiceFee(amount)
    } else if (currentFeeType === 'discount') {
      setDiscountAmount(amount)
    }
    setShowFeeModal(false)
  }

  // Calculate grand total with fees
  const calculateGrandTotal = () => {
    const itemsTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    return itemsTotal + deliveryFee + serviceFee - discountAmount
  }

  // Handle cash modal confirmation
  const handleCashConfirm = async (cashReceived: number, changeAmount: number) => {
    setShowCashModal(false)
    
    if (pendingAction === 'print') {
      await executePrintReceipt(cashReceived, changeAmount)
    } else if (pendingAction === 'confirm') {
      await executeConfirmOrder(cashReceived, changeAmount)
    }
    setPendingAction(null)
  }

  // Trigger cash modal for Mark Paid & Print Receipt (only if cashChangeEnabled and CASH payment)
  const handleMarkPaidAndPrint = () => {
    if (orderItems.length === 0) {
      toast.warning('No items to print', 'Please add items to the order first.')
      return
    }
    if (paymentMethod === 'CASH' && cashChangeEnabled) {
      setPendingAction('print')
      setShowCashModal(true)
    } else {
      executePrintReceipt(0, 0)
    }
  }

  // Confirm Order - NEVER shows cash modal, just creates order (unpaid or paid based on setting)
  const handleConfirmOrder = () => {
    if (orderItems.length === 0) {
      toast.warning('No items', 'Please add items to the order first.')
      return
    }
    executeConfirmOrder(0, 0)
  }

  const printReceiptForOrder = (order: any, cashReceived?: number, changeAmount?: number) => {
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
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee || deliveryFee,
      serviceFee: order.serviceFee || serviceFee,
      discountAmount: order.discountAmount || discountAmount,
      cashReceived: cashReceived,
      changeAmount: changeAmount
    })

    printWithIframe(receiptHTML)
  }

  const executePrintReceipt = async (cashReceived: number, changeAmount: number) => {
    if (orderItems.length === 0) {
      toast.warning('No items to print', 'Please add items to the order first.')
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
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          discountAmount: discountAmount,
          cashReceived: cashReceived > 0 ? cashReceived : undefined,
          changeAmount: changeAmount > 0 ? changeAmount : undefined,
          status: 'PREPARING', // Set to PREPARING when confirming via Mark Paid & Print
          paymentStatus: 'PAID' // Mark as paid
        }
        
        await ordersApi.update(editingOrder.id, updateData)
        
        // Print the receipt with existing order data
        printReceiptForOrder(editingOrder, cashReceived, changeAmount)
        
        toast.orderUpdated(formatOrderNumber(editingOrder.orderNumber), true)
        
        // Clear order state and navigate back
        clearOrder()
        navigate('/admin/orders', { replace: true })
      } catch (error: any) {
        console.error('Failed to update order:', error)
        toast.error('Failed to update order', error.response?.data?.error || error.message)
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
        deliveryFee: deliveryFee,
        serviceFee: serviceFee,
        discountAmount: discountAmount,
        cashReceived: cashReceived > 0 ? cashReceived : undefined,
        changeAmount: changeAmount > 0 ? changeAmount : undefined,
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
      
      // Store the order items before clearing for receipt printing
      const itemsForReceipt = orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
      const total = calculateGrandTotal()
      
      // Clear the order after successful creation
      clearOrder()
      
      // Print receipt with actual order number from created order
      const receiptHTML = generateReceiptHTML({
        orderNumber: createdOrder.orderNumber,
        createdAt: createdOrder.createdAt || new Date().toISOString(),
        customerName: customerName || undefined,
        tableNumber: tableNumber || undefined,
        orderType: orderType,
        paymentMethod: paymentMethod,
        items: itemsForReceipt,
        totalAmount: total,
        deliveryFee: deliveryFee,
        serviceFee: serviceFee,
        discountAmount: discountAmount,
        cashReceived: cashReceived > 0 ? cashReceived : undefined,
        changeAmount: changeAmount > 0 ? changeAmount : undefined
      })

      printWithIframe(receiptHTML)

      // If kitchen copy setting is enabled, print a second receipt for kitchen
      if (printKitchenCopy) {
        setTimeout(() => {
          const kitchenReceiptHTML = generateKitchenReceiptHTML({
            orderType: orderType,
            customerName: customerName || undefined,
            tableNumber: tableNumber || undefined,
            items: itemsForReceipt.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: 0 // Kitchen copy doesn't need price but type requires it
            })),
            orderNumber: createdOrder.orderNumber,
            totalAmount: 0
          })
          printWithIframe(kitchenReceiptHTML)
        }, 500) // Small delay to allow first print to complete
      }
      
      // Navigate back if reordering
      if (isReordering) {
        navigate('/admin/orders', { replace: true })
        return
      }
    } catch (error: any) {
      console.error('Failed to create order:', error)
      toast.error('Failed to create order', error.response?.data?.error || error.message)
      return
    }
  }

  const executeConfirmOrder = async (cashReceived: number, changeAmount: number) => {
    // Handle adding items to an existing tab order
    if (isAddingToTab && tabOrderId) {
      try {
        if (orderItems.length === 0) {
          toast.warning('No items', 'Please add items to the order')
          return
        }
        
        const items = orderItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price
        }))
        
        const updatedOrder = await ordersApi.addItemsToTab(tabOrderId, items)
        
        // Refresh max servings to account for new items
        await refreshMaxServings()
        
        // Show success toast
        toast.itemsAddedToTab(formatOrderNumber(addToTab?.orderNumber || ''), updatedOrder.totalAmount.toFixed(2))
        
        // Clear order state and navigate back
        clearOrder()
        navigate('/admin/orders', { replace: true })
      } catch (error: any) {
        console.error('Failed to add items to tab:', error)
        toast.error('Failed to add items to tab', error.response?.data?.error || error.message)
      }
      return
    }
    
    if (isEditMode && editingOrder) {
      // Update existing order and set status to PREPARING
      try {
        // Update order details and set status to PREPARING (cashier confirmed the order)
        const updateData: any = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          discountAmount: discountAmount,
          cashReceived: cashReceived > 0 ? cashReceived : undefined,
          changeAmount: changeAmount > 0 ? changeAmount : undefined,
          status: 'PREPARING' // Auto-set to PREPARING when cashier confirms edited order
        }
        
        await ordersApi.update(editingOrder.id, updateData)
        
        // Print kitchen copy if setting is enabled for Open Tab (edit mode)
        if (printKitchenCopyForOpenTab) {
          const kitchenReceiptHTML = generateKitchenReceiptHTML({
            orderNumber: editingOrder.orderNumber,
            tableNumber: tableNumber || undefined,
            items: orderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            totalAmount: calculateGrandTotal()
          })
          printWithIframe(kitchenReceiptHTML)
        }
        
        // Show success toast
        toast.orderUpdated(formatOrderNumber(editingOrder.orderNumber), false)
        
        // Clear order state
        clearOrder()
        
        // Navigate back to orders page
        navigate('/admin/orders', { replace: true })
      } catch (error: any) {
        console.error('Failed to update order:', error)
        toast.error('Failed to update order', error.response?.data?.error || error.message)
      }
    } else {
      // Create order via API
      try {
        const orderData = {
          customerName: customerName || undefined,
          tableNumber: tableNumber || undefined,
          orderType: orderType,
          paymentMethod: paymentMethod,
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          discountAmount: discountAmount,
          cashReceived: cashReceived > 0 ? cashReceived : undefined,
          changeAmount: changeAmount > 0 ? changeAmount : undefined,
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
        
        // Print kitchen copy if setting is enabled for Open Tab
        if (printKitchenCopyForOpenTab && !isLinkingOrder && !isReordering) {
          const kitchenReceiptHTML = generateKitchenReceiptHTML({
            orderNumber: createdOrder.orderNumber,
            tableNumber: tableNumber || undefined,
            items: orderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            totalAmount: calculateGrandTotal()
          })
          printWithIframe(kitchenReceiptHTML)
        }
        
        // Show success toast with order number
        if (isLinkingOrder) {
          toast.linkedOrderCreated(formatOrderNumber(createdOrder.orderNumber), formatOrderNumber(linkToOrder?.orderNumber || ''))
        } else {
          toast.orderCreated(formatOrderNumber(createdOrder.orderNumber), createdOrder.totalAmount.toFixed(2), false)
        }
        clearOrder()
        
        // Navigate to orders page if reordering or linking
        if (isReordering || isLinkingOrder) {
          navigate('/admin/orders', { replace: true })
        }
      } catch (error: any) {
        console.error('Failed to create order:', error)
        console.error('Error response:', error.response?.data)
        toast.error('Failed to create order', error.response?.data?.error || error.message)
      }
    }
  }

  const cancelEdit = () => {
    navigate('/admin/orders')
  }

  // Filter by category - use categoryId for matching
  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : selectedCategory === 'best seller'
    ? menuItems.filter(item => item.featured)
    : menuItems.filter((item) => (item as any).categoryId === selectedCategory || item.category === selectedCategory.toLowerCase())

  // Apply search filter
  const searchFilteredItems = searchQuery.trim() 
    ? filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems

  // Sort items: available items first, out-of-stock at the bottom (only if autoOutOfStock is enabled)
  const sortedItems = [...searchFilteredItems].sort((a, b) => {
    // Only consider ingredient-based out-of-stock if auto setting is enabled
    const aOutOfStock = autoOutOfStockWhenIngredientsRunOut && maxServings[a.id] === 0
    const bOutOfStock = autoOutOfStockWhenIngredientsRunOut && maxServings[b.id] === 0
    if (aOutOfStock && !bOutOfStock) return 1  // a goes to bottom
    if (!aOutOfStock && bOutOfStock) return -1 // b goes to bottom
    return 0 // maintain original order
  })

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <AdminLayout hideHeaderOnDesktop noPadding>
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
          {/* Add to Tab Mode Banner */}
          {isAddingToTab && (
            <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-medium">📋 Adding to Tab: {addToTab?.orderNumber}</p>
                <p className="text-xs opacity-90">Items will be added to existing order for {customerName || 'Guest'} (Table {tableNumber || 'N/A'})</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/admin/orders')}
                className="bg-white text-emerald-600 border-white hover:bg-emerald-50 font-medium"
              >
                Cancel
              </Button>
            </div>
          )}
          {/* Category Tabs */}
          <div className="bg-white border-b border-gray-200 p-3 lg:p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg lg:text-xl font-bold">
                {isEditMode ? 'Edit Order - Menu' : isReordering ? 'Reorder - Menu' : isLinkingOrder ? 'Add Items - Menu' : isAddingToTab ? 'Add Items to Tab - Menu' : 'Menu'}
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
              {/* All & Best Seller fixed buttons */}
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="capitalize whitespace-nowrap text-xs lg:text-sm flex-shrink-0"
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'best seller' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('best seller')}
                className="capitalize whitespace-nowrap text-xs lg:text-sm flex-shrink-0"
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
                  className="capitalize whitespace-nowrap text-xs lg:text-sm flex-shrink-0"
                >
                  {category.displayName}
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
                <div className={`grid gap-2 lg:gap-3 ${
                  posMobileColumnsPerRow === 1 ? 'grid-cols-1' : 
                  posMobileColumnsPerRow === 2 ? 'grid-cols-2' : 
                  posMobileColumnsPerRow === 3 ? 'grid-cols-3' : 
                  'grid-cols-4'
                } sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`}>
                  {sortedItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToOrder={addToOrder}
                      maxServings={maxServings[item.id]}
                      mobileSize={posMobileCardSize}
                      autoOutOfStock={autoOutOfStockWhenIngredientsRunOut}
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
            deliveryFee={deliveryFee}
            serviceFee={serviceFee}
            discountAmount={discountAmount}
            onCustomerNameChange={setCustomerName}
            onTableNumberChange={setTableNumber}
            onPaymentMethodChange={setPaymentMethod}
            onOrderTypeChange={setOrderType}
            onDeliveryFeeClick={handleDeliveryFeeClick}
            onServiceFeeClick={handleServiceFeeClick}
            onDiscountClick={handleDiscountClick}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onClearOrder={clearOrder}
            onConfirmOrder={handleConfirmOrder}
            onPrintReceipt={handleMarkPaidAndPrint}
            confirmButtonText={isAddingToTab ? 'Add to Tab' : isLinkingOrder ? 'Create Linked Order' : 'Open Tab'}
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up overflow-hidden">
              <OrderSummary
                items={orderItems}
                customerName={customerName}
                tableNumber={tableNumber}
                paymentMethod={paymentMethod}
                orderType={orderType}
                deliveryFee={deliveryFee}
                serviceFee={serviceFee}
                discountAmount={discountAmount}
                onCustomerNameChange={setCustomerName}
                onTableNumberChange={setTableNumber}
                onPaymentMethodChange={setPaymentMethod}
                onOrderTypeChange={setOrderType}
                onDeliveryFeeClick={handleDeliveryFeeClick}
                onServiceFeeClick={handleServiceFeeClick}
                onDiscountClick={handleDiscountClick}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onClearOrder={clearOrder}
                onConfirmOrder={() => {
                  handleConfirmOrder()
                  setIsCartOpen(false)
                }}
                onPrintReceipt={handleMarkPaidAndPrint}
                confirmButtonText={isAddingToTab ? 'Add to Tab' : isLinkingOrder ? 'Create Linked Order' : 'Open Tab'}
              />
            </div>
          </>
        )}
      </div>

      {/* Cash Calculator Modal */}
      <CashCalculatorModal
        isOpen={showCashModal}
        onClose={() => {
          setShowCashModal(false)
          setPendingAction(null)
        }}
        onConfirm={handleCashConfirm}
        totalAmount={calculateGrandTotal()}
        title={pendingAction === 'print' ? 'Payment - Print Receipt' : 'Payment'}
      />

      {/* Fee Input Modal */}
      <FeeInputModal
        isOpen={showFeeModal}
        onClose={() => setShowFeeModal(false)}
        onConfirm={handleFeeConfirm}
        feeType={currentFeeType}
        currentAmount={
          currentFeeType === 'delivery' ? deliveryFee :
          currentFeeType === 'service' ? serviceFee :
          discountAmount
        }
        subtotal={orderItems.reduce((sum, item) => sum + item.subtotal, 0)}
      />
    </AdminLayout>
  )
}
