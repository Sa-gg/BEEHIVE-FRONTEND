import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import type { MenuItem } from '../../../core/domain/entities/MenuItem.entity'
import type { OrderItem } from '../../../core/domain/entities/Order.entity'
import { MenuItemCard } from '../../components/features/POS/MenuItemCard'
import { OrderSummary } from '../../components/features/POS/OrderSummary'
import { Button } from '../../components/common/ui/button'
import { ShoppingCart, Search, Loader2 } from 'lucide-react'
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
import { ConfirmationModal } from '../../components/common/ConfirmationModal'
import { AddonsVariantsModal, type AddonSelection, type VariantSelection } from '../../components/features/shared/AddonsVariantsModal'
import { addonsApi } from '../../../infrastructure/api/addons.api'
import { LoyaltySelectModal, type LoyaltySelection } from '../../components/features/POS/LoyaltySelectModal'

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
  const { markPaidOnPrintReceipt, printKitchenCopy, printKitchenCopyForOpenTab, cashChangeEnabled, posMobileColumnsPerRow, posMobileCardSize, autoOutOfStockWhenIngredientsRunOut, loyaltySystemEnabled } = useSettingsStore()
  
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
  
  // Stock warning confirmation modal state
  const [showStockWarningModal, setShowStockWarningModal] = useState(false)
  const [stockWarnings, setStockWarnings] = useState<string[]>([])
  const [stockWarningAction, setStockWarningAction] = useState<'print' | 'confirm' | null>(null)
  
  // Variants/Add-ons modal state
  const [showAddonsModal, setShowAddonsModal] = useState(false)
  const [selectedMenuItemForAddons, setSelectedMenuItemForAddons] = useState<MenuItem | null>(null)
  const [menuItemsWithAddons, setMenuItemsWithAddons] = useState<Set<string>>(new Set())
  
  // Loyalty modal state
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false)
  const [loyaltySelection, setLoyaltySelection] = useState<LoyaltySelection | null>(null)
  const [loyaltyPendingAction, setLoyaltyPendingAction] = useState<'confirm' | 'print' | null>(null)
  
  // Race condition prevention - track processing state for each menu item
  const [processingItemIds, setProcessingItemIds] = useState<Set<string>>(new Set())

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
        const [categoriesResponse, servingsData, browseData] = await Promise.all([
          categoriesApi.getAll(),
          recipeApi.getAllMaxServings(),
          addonsApi.getMenuItemsForBrowsing({ available: true })
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
        
        // Convert API DTOs to MenuItem format
        // Use browseData which already handles showInMenu logic for ADDON items
        const items: MenuItem[] = browseData.map((item: any) => ({
          id: item.id,
          name: item.name,
          // Use categoryId for filtering, but display category name
          categoryId: item.categoryId,
          category: (item.category?.displayName || item.category?.name || '').toLowerCase().replace('_', ' ') as MenuItem['category'],
          price: item.price,
          image: getImageUrl(item.image) || undefined,
          available: item.available,
          featured: item.featured,
          outOfStock: item.outOfStock // Include the manual out of stock flag
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
    // Prevent rapid clicking - check if this item is being processed
    if (processingItemIds.has(menuItem.id)) {
      return
    }
    
    // Check if this item has variants or add-ons
    if (menuItemsWithAddons.has(menuItem.id)) {
      // Open addons/variants modal
      setSelectedMenuItemForAddons(menuItem)
      setShowAddonsModal(true)
      return
    }
    
    // Simple item without variants/add-ons - add directly
    addSimpleItemToOrder(menuItem)
  }
  
  // Add a simple item without variants/add-ons
  const addSimpleItemToOrder = (menuItem: MenuItem) => {
    // Prevent rapid clicking - check if this item is being processed
    if (processingItemIds.has(menuItem.id)) {
      return
    }
    
    // Mark item as processing
    setProcessingItemIds(prev => new Set(prev).add(menuItem.id))
    
    // Check if item is manually marked as out of stock
    if ((menuItem as any).outOfStock === true) {
      toast.warning('Out of Stock', 'This item has been marked as out of stock')
      setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItem.id); return next })
      return
    }
    
    // Check stock limits if auto out of stock is enabled
    if (autoOutOfStockWhenIngredientsRunOut) {
      const availableStock = maxServings[menuItem.id]
      // If we have recipe-based stock tracking (not unlimited)
      if (availableStock !== undefined && availableStock !== -1) {
        // availableStock already accounts for current cart, so we can only add if > 0
        if (availableStock <= 0) {
          toast.warning('Stock Limit', `Cannot add more ${menuItem.name}. Stock limit reached.`)
          setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItem.id); return next })
          return
        }
      }
    }
    
    setOrderItems((prev) => {
      // For simple items without variants/addons, aggregate by menuItemId
      const existingItem = prev.find((item) => 
        item.menuItemId === menuItem.id && 
        !item.variantId && 
        (!item.addons || item.addons.length === 0)
      )
      
      if (existingItem) {
        return prev.map((item) =>
          item === existingItem
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
    
    // Clear processing state after a short delay to allow maxServings to update
    setTimeout(() => {
      setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItem.id); return next })
    }, 350)
  }
  
  // Helper to check if two addon arrays are equivalent
  const areAddonsEqual = (addons1: OrderItem['addons'], addons2: OrderItem['addons']): boolean => {
    if (!addons1 && !addons2) return true
    if (!addons1 || !addons2) return false
    if (addons1.length !== addons2.length) return false
    
    // Sort by addonItemId for comparison
    const sorted1 = [...addons1].sort((a, b) => a.addonItemId.localeCompare(b.addonItemId))
    const sorted2 = [...addons2].sort((a, b) => a.addonItemId.localeCompare(b.addonItemId))
    
    return sorted1.every((addon, idx) => 
      addon.addonItemId === sorted2[idx].addonItemId && 
      addon.quantity === sorted2[idx].quantity
    )
  }

  // Add item with variants/add-ons from the modal
  const addItemWithAddonsToOrder = (
    menuItem: MenuItem,
    variant: VariantSelection | null,
    addons: AddonSelection[],
    notes: string,
    finalPrice: number,
    quantity: number = 1 // Support quantity from modal
  ) => {
    const newAddons = addons.length > 0 ? addons.map(a => ({
      addonItemId: a.addonItemId,
      addonName: a.addonName,
      unitPrice: a.addonPrice,
      quantity: a.quantity,
      subtotal: a.addonPrice * a.quantity
    })) : undefined
    
    setOrderItems((prev) => {
      // Try to find an existing item with same menuItemId, variant, addons, and notes
      const existingIndex = prev.findIndex((item) => 
        item.menuItemId === menuItem.id && 
        item.variantId === (variant?.id || undefined) &&
        areAddonsEqual(item.addons, newAddons) &&
        (item.notes || '') === (notes || '')
      )
      
      if (existingIndex !== -1) {
        // Item with same config exists - increment quantity
        const existingItem = prev[existingIndex]
        const newQuantity = existingItem.quantity + quantity
        // Recalculate subtotal: unitPrice * newQuantity
        const unitPrice = finalPrice / quantity // Get unit price from finalPrice
        const newSubtotal = unitPrice * newQuantity
        
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
            : item
        )
      }
      
      // No matching item - add new order item
      const orderItem: OrderItem = {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantity,
        subtotal: finalPrice,
        variantId: variant?.id,
        variantName: variant?.name,
        variantPriceDelta: variant?.priceDelta,
        notes: notes || undefined,
        addons: newAddons
      }
      
      return [...prev, orderItem]
    })
    
    setShowAddonsModal(false)
    setSelectedMenuItemForAddons(null)
  }

  const updateQuantity = (menuItemId: string, quantity: number, itemIndex?: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId, itemIndex)
      return
    }
    
    // Prevent rapid clicking - check if this item is being processed
    if (processingItemIds.has(menuItemId)) {
      return
    }
    
    // Get current quantity of this item in cart
    let currentQuantity = 0
    if (itemIndex !== undefined) {
      currentQuantity = orderItems[itemIndex]?.quantity || 0
    } else {
      const item = orderItems.find(i => i.menuItemId === menuItemId && !i.variantId && (!i.addons || i.addons.length === 0))
      currentQuantity = item?.quantity || 0
    }
    
    // Only check stock limits when INCREASING quantity
    const isIncreasing = quantity > currentQuantity
    
    if (isIncreasing && autoOutOfStockWhenIngredientsRunOut) {
      // Mark as processing to prevent race conditions
      setProcessingItemIds(prev => new Set(prev).add(menuItemId))
      
      const availableStock = maxServings[menuItemId]
      // If we have recipe-based stock tracking (not unlimited)
      if (availableStock !== undefined && availableStock !== -1) {
        // The maxServings already accounts for cart + preparing orders from the API
        // For increasing, we need to check if the additional quantity is available
        const additionalQuantity = quantity - currentQuantity
        if (additionalQuantity > availableStock) {
          toast.warning('Stock Limit', `Only ${availableStock} more available in stock`)
          // If we can add some but not all, add what we can
          if (availableStock > 0) {
            quantity = currentQuantity + availableStock
          } else {
            // Clear processing state and return
            setTimeout(() => {
              setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItemId); return next })
            }, 300)
            return // Can't add any more
          }
        }
      }
    }
    
    // Also check if item is manually marked as out of stock (only when increasing)
    if (isIncreasing) {
      const menuItem = menuItems.find(item => item.id === menuItemId)
      if (menuItem && (menuItem as any).outOfStock === true) {
        toast.warning('Out of Stock', 'This item has been marked as out of stock')
        // Clear processing state
        setTimeout(() => {
          setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItemId); return next })
        }, 300)
        return
      }
    }
    
    setOrderItems((prev) => {
      // For items with variants/add-ons, use itemIndex to identify the specific item
      if (itemIndex !== undefined) {
        return prev.map((item, index) => {
          if (index !== itemIndex) return item
          
          // Recalculate subtotal including variant delta and addons
          const basePrice = item.price + (item.variantPriceDelta || 0)
          const addonsTotal = item.addons?.reduce((sum, a) => sum + (a.unitPrice * a.quantity), 0) || 0
          const newSubtotal = (basePrice + addonsTotal) * quantity
          
          return {
            ...item,
            quantity,
            subtotal: newSubtotal,
          }
        })
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
    
    // Clear processing state after update
    if (isIncreasing) {
      setTimeout(() => {
        setProcessingItemIds(prev => { const next = new Set(prev); next.delete(menuItemId); return next })
      }, 350)
    }
  }

  const removeItem = (menuItemId: string, itemIndex?: number) => {
    setOrderItems((prev) => {
      // For items with variants/add-ons, use itemIndex
      if (itemIndex !== undefined) {
        return prev.filter((_, index) => index !== itemIndex)
      }
      // For simple items, match by menuItemId (and ensure it's a simple item)
      return prev.filter((item) => 
        item.menuItemId !== menuItemId || item.variantId || (item.addons && item.addons.length > 0)
      )
    })
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
    setLoyaltySelection(null)
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
    
    // Always validate stock availability to warn about potential overselling
    const { valid, warnings } = validateStockAvailability()
    if (!valid) {
      // Show custom modal instead of browser confirm
      setStockWarnings(warnings)
      setStockWarningAction('print')
      setShowStockWarningModal(true)
      return
    }
    
    // For new orders (not edit mode), show loyalty modal first (only if loyalty system is enabled)
    if (!isEditMode && !isAddingToTab && loyaltySystemEnabled) {
      setLoyaltyPendingAction('print')
      setShowLoyaltyModal(true)
      return
    }
    
    if (paymentMethod === 'CASH' && cashChangeEnabled) {
      setPendingAction('print')
      setShowCashModal(true)
    } else {
      executePrintReceipt(0, 0)
    }
  }

  // Validate stock for all items in the order
  // Warns about potential discrepancies when ordering items with insufficient stock
  const validateStockAvailability = (): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = []
    
    // Group items by menuItemId and sum quantities
    const itemQuantities = orderItems.reduce((acc, item) => {
      acc[item.menuItemId] = (acc[item.menuItemId] || 0) + item.quantity
      return acc
    }, {} as Record<string, number>)
    
    // Check each item against available stock
    // maxServings represents REMAINING stock after cart items are already subtracted by the API
    // A value of 0 means the cart exactly uses all available stock
    // A negative value would indicate exceeding stock, but API clamps to 0
    // So if remainingStock is 0 and we have items in cart, we're at the limit
    // If remainingStock is 0 and the original stock was also 0, we have a discrepancy
    for (const [menuItemId, cartQuantity] of Object.entries(itemQuantities)) {
      const remainingStock = maxServings[menuItemId]
      // Skip if no recipe tracking (undefined or -1 means unlimited/no recipe)
      if (remainingStock === undefined || remainingStock === -1) continue
      
      // remainingStock is what's left AFTER cart is subtracted
      // So total original stock = remainingStock + cartQuantity
      // If remainingStock < 0, we've exceeded (but API clamps to 0)
      // If remainingStock = 0 and cartQuantity > 0, we're at exact limit OR exceeding
      // The key insight: if remainingStock is 0, it could mean:
      // 1. We ordered exactly what was available (OK but tight)
      // 2. Original stock was 0 and we're creating a discrepancy (NOT OK)
      // 
      // To detect discrepancy: if remainingStock is 0 and cartQuantity > 0,
      // the original stock was equal to cartQuantity (tight) OR less (discrepancy)
      // Since the API clamps, if original stock was less than cart, remaining would still be 0
      // 
      // SAFEST: Warn when remainingStock <= 0 (stock is depleted or will create discrepancy)
      if (remainingStock <= 0) {
        const item = orderItems.find(i => i.menuItemId === menuItemId)
        if (item) {
          // Calculate what the original stock was before cart was added
          // Since API clamps to 0, if remaining=0, original could be 0 to cartQuantity
          // We show warning that stock will be depleted/negative after this order
          warnings.push(`${item.name}: ordering ${cartQuantity}, stock will be depleted or negative after this order`)
        }
      }
    }
    
    return { valid: warnings.length === 0, warnings }
  }

  // Confirm Order - NEVER shows cash modal, just creates order (unpaid or paid based on setting)
  const handleConfirmOrder = () => {
    if (orderItems.length === 0) {
      toast.warning('No items', 'Please add items to the order first.')
      return
    }
    
    // Always validate stock availability to warn about potential overselling
    const { valid, warnings } = validateStockAvailability()
    if (!valid) {
      // Show custom modal instead of browser confirm
      setStockWarnings(warnings)
      setStockWarningAction('confirm')
      setShowStockWarningModal(true)
      return
    }
    
    // For new orders (not edit mode), show loyalty modal first (only if loyalty system is enabled)
    if (!isEditMode && !isAddingToTab && loyaltySystemEnabled) {
      setLoyaltyPendingAction('confirm')
      setShowLoyaltyModal(true)
      return
    }
    
    executeConfirmOrder(0, 0)
  }
  
  // Handle stock warning confirmation
  const handleStockWarningConfirm = () => {
    setShowStockWarningModal(false)
    
    if (stockWarningAction === 'print') {
      // For new orders, show loyalty modal first (only if loyalty system is enabled)
      if (!isEditMode && !isAddingToTab && loyaltySystemEnabled) {
        setLoyaltyPendingAction('print')
        setShowLoyaltyModal(true)
      } else if (paymentMethod === 'CASH' && cashChangeEnabled) {
        setPendingAction('print')
        setShowCashModal(true)
      } else {
        executePrintReceipt(0, 0)
      }
    } else if (stockWarningAction === 'confirm') {
      // For new orders, show loyalty modal first (only if loyalty system is enabled)
      if (!isEditMode && !isAddingToTab && loyaltySystemEnabled) {
        setLoyaltyPendingAction('confirm')
        setShowLoyaltyModal(true)
      } else {
        executeConfirmOrder(0, 0)
      }
    }
    
    setStockWarningAction(null)
    setStockWarnings([])
  }

  // Handle loyalty selection confirmation
  const handleLoyaltyConfirm = (selection: LoyaltySelection) => {
    setLoyaltySelection(selection)
    setShowLoyaltyModal(false)
    
    // Update customer name if provided
    if (selection.customerName) {
      setCustomerName(selection.customerName)
    }
    
    if (loyaltyPendingAction === 'print') {
      if (paymentMethod === 'CASH' && cashChangeEnabled) {
        setPendingAction('print')
        setShowCashModal(true)
      } else {
        executePrintReceipt(0, 0)
      }
    } else if (loyaltyPendingAction === 'confirm') {
      executeConfirmOrder(0, 0)
    }
    
    setLoyaltyPendingAction(null)
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
        price: item.price,
        subtotal: item.subtotal,
        variantName: item.variantName,
        variantPriceDelta: item.variantPriceDelta,
        notes: item.notes,
        addons: item.addons?.map((a: any) => ({
          addonName: a.addonName,
          quantity: a.quantity,
          addonPrice: a.unitPrice,
          subtotal: a.subtotal || a.unitPrice * a.quantity
        }))
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
        customerName: customerName || loyaltySelection?.customerName || undefined,
        customerPhone: loyaltySelection?.customerPhone || undefined,
        loyaltyCardCode: loyaltySelection?.cardCode || undefined,
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
        price: item.price,
        subtotal: item.subtotal,
        variantName: item.variantName || undefined,
        variantPriceDelta: item.variantPriceDelta,
        notes: item.notes || undefined,
        addons: item.addons?.map(a => ({
          addonName: a.addonName,
          quantity: a.quantity,
          addonPrice: a.unitPrice,
          subtotal: a.subtotal || a.unitPrice * a.quantity
        }))
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
              price: 0, // Kitchen copy doesn't need price but type requires it
              variantName: item.variantName || undefined,
              notes: item.notes || undefined,
              addons: item.addons?.map(a => ({
                addonName: a.addonName,
                quantity: a.quantity,
                addonPrice: 0,
                subtotal: 0
              }))
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
              price: item.price,
              variantName: item.variantName || undefined,
              notes: item.notes || undefined,
              addons: item.addons?.map(a => ({
                addonName: a.addonName,
                quantity: a.quantity,
                addonPrice: 0,
                subtotal: 0
              }))
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
          customerName: customerName || loyaltySelection?.customerName || undefined,
          customerPhone: loyaltySelection?.customerPhone || undefined,
          loyaltyCardCode: loyaltySelection?.cardCode || undefined,
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
              price: item.price,
              variantName: item.variantName || undefined,
              notes: item.notes || undefined,
              addons: item.addons?.map(a => ({
                addonName: a.addonName,
                quantity: a.quantity,
                addonPrice: 0,
                subtotal: 0
              }))
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

  // Filter by category - use categoryId for matching (memoized for performance)
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return menuItems
    if (selectedCategory === 'best seller') return menuItems.filter(item => item.featured)
    return menuItems.filter((item) => (item as any).categoryId === selectedCategory || item.category === selectedCategory.toLowerCase())
  }, [menuItems, selectedCategory])

  // Apply search filter (memoized for performance)
  const searchFilteredItems = useMemo(() => {
    if (!searchQuery.trim()) return filteredItems
    const query = searchQuery.toLowerCase()
    return filteredItems.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  }, [filteredItems, searchQuery])

  // Sort items: out-of-stock items at the bottom (memoized for performance)
  const sortedItems = useMemo(() => {
    return [...searchFilteredItems].sort((a, b) => {
      // Check manual out of stock flag first (set by manager in Products page)
      const aManualOutOfStock = (a as any).outOfStock === true
      const bManualOutOfStock = (b as any).outOfStock === true
      // Also consider ingredient-based out-of-stock if auto setting is enabled
      const aIngredientOutOfStock = autoOutOfStockWhenIngredientsRunOut && maxServings[a.id] === 0
      const bIngredientOutOfStock = autoOutOfStockWhenIngredientsRunOut && maxServings[b.id] === 0
      // Item is out of stock if manually marked OR (auto enabled AND ingredients out)
      const aOutOfStock = aManualOutOfStock || aIngredientOutOfStock
      const bOutOfStock = bManualOutOfStock || bIngredientOutOfStock
      if (aOutOfStock && !bOutOfStock) return 1  // a goes to bottom
      if (!aOutOfStock && bOutOfStock) return -1 // b goes to bottom
      return 0 // maintain original order
    })
  }, [searchFilteredItems, autoOutOfStockWhenIngredientsRunOut, maxServings])

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
      
      {/* Add-ons & Variants Modal */}
      {selectedMenuItemForAddons && (
        <AddonsVariantsModal
          isOpen={showAddonsModal}
          onClose={() => {
            setShowAddonsModal(false)
            setSelectedMenuItemForAddons(null)
          }}
          menuItem={{
            id: selectedMenuItemForAddons.id,
            name: selectedMenuItemForAddons.name,
            price: selectedMenuItemForAddons.price
          }}
          // Pass cart items so variant stock can be calculated with current cart considered
          cartItems={orderItems.map(item => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            quantity: item.quantity
          }))}
          // Pass base product max servings for real-time variant stock display
          baseMaxServings={maxServings[selectedMenuItemForAddons.id]}
          // Pass auto out-of-stock setting for variant stock behavior
          autoOutOfStockWhenIngredientsRunOut={autoOutOfStockWhenIngredientsRunOut}
          onConfirm={(data) => {
            addItemWithAddonsToOrder(
              selectedMenuItemForAddons,
              data.variantId ? { id: data.variantId, name: data.variantName || '', priceDelta: data.variantPriceDelta } : null,
              data.addons.map(a => ({
                addonItemId: a.addonItemId,
                addonName: a.addonName,
                addonPrice: a.unitPrice,
                quantity: a.quantity
              })),
              data.notes,
              data.finalPrice,
              data.quantity // Pass quantity from modal
            )
          }}
        />
      )}
      
      {/* Stock Warning Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStockWarningModal}
        onClose={() => {
          setShowStockWarningModal(false)
          setStockWarningAction(null)
          setStockWarnings([])
        }}
        onConfirm={handleStockWarningConfirm}
        title="Stock Warning"
        message={stockWarnings}
        type="warning"
        confirmText="Proceed Anyway"
        cancelText="Go Back"
      />

      {/* Loyalty Selection Modal */}
      <LoyaltySelectModal
        open={showLoyaltyModal}
        onClose={() => {
          setShowLoyaltyModal(false)
          setLoyaltyPendingAction(null)
        }}
        onConfirm={handleLoyaltyConfirm}
        currentCustomerName={customerName}
      />
    </AdminLayout>
  )
}
