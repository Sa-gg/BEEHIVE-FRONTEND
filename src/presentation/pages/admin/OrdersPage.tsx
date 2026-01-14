import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Clock, CheckCircle, XCircle, Package, Search, Filter, Eye, Loader2, Printer, Merge, X, Grid3X3, LayoutGrid, MoreVertical, AlertTriangle, Ban, DollarSign, Gift, FileX, Link2, RotateCcw, ChefHat, Plus, Trash2, Columns3, Rows3 } from 'lucide-react'
import { ordersApi, type PaymentStatus, type OrderStatus } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { useOrderEvents } from '../../../shared/hooks/useOrderEvents'
import { ManagerPinModal } from '../../components/common/ManagerPinModal'
import { CashCalculatorModal } from '../../components/common/CashCalculatorModal'
import { generateReceiptHTML, generateMergedReceiptHTML, generateLinkedOrdersReceiptHTML, type ReceiptItem } from '../../../shared/utils/receiptTemplate'
import { useSettingsStore } from '../../store/settingsStore'
import { toast } from '../../components/common/ToastNotification'

// Helper to format order number - removes date prefix for cleaner display
// ORD-20251227-00001 -> ORD-00001
const formatOrderNumber = (orderNumber: string): string => {
  const match = orderNumber.match(/ORD-\d{8}-(\d+)/)
  if (match) {
    return `ORD-${match[1]}`
  }
  return orderNumber
}

interface OrderItemAddon {
  addonItemId: string
  addonName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  subtotal: number
  menuItemId: string
  status?: 'PREPARING' | 'COMPLETED' | 'VOIDED'
  variantId?: string | null
  variantName?: string | null
  variantPriceDelta?: number
  addons?: OrderItemAddon[]
  notes?: string | null
}

interface Order {
  id: string
  orderNumber: string
  customerName: string | null
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
  deliveryFee: number
  serviceFee: number
  cashReceived?: number | null
  changeAmount?: number | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod?: string | null
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'
  tableNumber?: string | null
  createdAt: string
  completedAt?: string | null
  paidAt?: string | null
  subtotal: number
  tax: number
  createdBy?: string | null
  processedBy?: string | null
  linkedOrderId?: string | null
  notes?: string | null
  authorizedBy?: string | null
}

export const OrdersPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    cashChangeEnabled, 
    showHeaderInOrdersPage,
    showOverviewCardsInOrdersPage, 
    showOverviewInHeaderOrdersPage,
    statusSeparatorDirection, 
    setStatusSeparatorDirection 
  } = useSettingsStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const [menuItemsLoaded, setMenuItemsLoaded] = useState(false)
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  
  // Link orders state - replaced merge with link functionality
  const [selectedOrdersForLink, setSelectedOrdersForLink] = useState<Set<string>>(new Set())
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [mergedOrderData, setMergedOrderData] = useState<{
    mergedOrderIds: string[];
    orderNumbers: string[];
    customerName: string | null;
    tableNumber: string | null;
    items: Array<{ menuItemId: string; name: string; quantity: number; price: number; subtotal: number }>;
    subtotal: number;
    tax: number;
    totalAmount: number;
    orderType: string;
  } | null>(null)
  const [mergePaymentMethod, setMergePaymentMethod] = useState<string>('CASH')
  
  // Grid layout configuration
  const [gridColumns, setGridColumns] = useState<number>(() => {
    const saved = localStorage.getItem('orderGridColumns')
    return saved ? parseInt(saved) : 1
  })

  // Manager PIN modal state
  const [showManagerPinModal, setShowManagerPinModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'void' | 'refund' | 'complimentary' | 'writeOff' | 'voidAndReorder' | 'voidItem'
    orderId: string
    order?: Order
    itemId?: string
    itemName?: string
  } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [showReasonModal, setShowReasonModal] = useState(false)
  
  // More actions dropdown state
  const [openMoreActionsId, setOpenMoreActionsId] = useState<string | null>(null)
  
  // Cash calculator modal state
  const [showCashModal, setShowCashModal] = useState(false)
  const [cashModalOrder, setCashModalOrder] = useState<Order | null>(null)
  const [cashModalMarkPaid, setCashModalMarkPaid] = useState(false)

  // Function to refresh orders list
  const refreshOrders = useCallback(async () => {
    try {
      const fetchedOrders = await ordersApi.getAll()
      const ordersWithNames = fetchedOrders.map(order => ({
        ...order,
        customerName: order.customerName || 'Guest',
        items: order.order_items.map(item => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: menuItems.get(item.menuItemId) || `Unknown Item`,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          status: item.status,
          variantId: (item as any).variantId,
          variantName: (item as any).variant?.name || (item as any).variantName,
          variantPriceDelta: (item as any).variant?.priceDelta || (item as any).variantPriceDelta,
          notes: (item as any).notes,
          addons: (item as any).order_item_addons?.map((a: any) => ({
            addonItemId: a.addonItemId,
            addonName: a.addon_item?.name || a.addonName || 'Add-on',
            quantity: a.quantity,
            unitPrice: a.unitPrice,
            subtotal: a.subtotal
          }))
        }))
      }))
      const activeOrders = ordersWithNames.filter(
        order => !(order.status === 'COMPLETED' && order.paymentStatus === 'PAID')
      )
      setOrders(activeOrders)
    } catch (error) {
      console.error('Failed to fetch updated orders:', error)
    }
  }, [menuItems])

  // Real-time order events handler - just refresh data (sound/banner handled by AdminLayout)
  const handleNewOrder = useCallback(() => {
    console.log('OrdersPage: New order received, refreshing list')
    refreshOrders()
  }, [refreshOrders])

  const handleOrderUpdate = useCallback(() => {
    console.log('OrdersPage: Order updated, refreshing list')
    refreshOrders()
  }, [refreshOrders])

  // Subscribe to real-time order events (for data refresh only - notifications handled globally)
  useOrderEvents({
    type: 'cashier',
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate
  })

  // Save grid columns preference
  useEffect(() => {
    localStorage.setItem('orderGridColumns', gridColumns.toString())
  }, [gridColumns])

  // Status color configuration for left border
  const statusBorderColors = {
    PENDING: 'border-l-yellow-500',
    PREPARING: 'border-l-blue-500',
    READY: 'border-l-purple-500',
    COMPLETED: 'border-l-green-500',
    CANCELLED: 'border-l-red-500',
  }

  // Fetch menu items for mapping IDs to names
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await menuItemsApi.getAll()
        const items = response.data || response // Handle both response formats
        const itemsMap = new Map(items.map((item: any) => [item.id, item.name]))
        console.log('Menu items loaded:', itemsMap.size, 'items')
        setMenuItems(itemsMap)
      } catch (error) {
        console.error('Failed to fetch menu items:', error)
      } finally {
        setMenuItemsLoaded(true)
      }
    }
    fetchMenuItems()
  }, [])

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      if (!menuItemsLoaded) return
      
      try {
        setLoading(true)
        const fetchedOrders = await ordersApi.getAll()
        
        // Map order items with menu item names
        const ordersWithNames = fetchedOrders.map(order => ({
          ...order,
          customerName: order.customerName || 'Guest',
          items: order.order_items.map(item => {
            const itemName = menuItems.get(item.menuItemId)
            console.log(`Mapping item ${item.menuItemId} to name:`, itemName)
            return {
              id: item.id,
              menuItemId: item.menuItemId,
              name: itemName || `Unknown Item (${item.menuItemId})`,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              status: item.status, // Include item status (PREPARING, COMPLETED, VOIDED)
              variantId: (item as any).variantId,
              variantName: (item as any).variant?.name || (item as any).variantName,
              variantPriceDelta: (item as any).variant?.priceDelta || (item as any).variantPriceDelta,
              notes: (item as any).notes,
              addons: (item as any).order_item_addons?.map((a: any) => ({
                addonItemId: a.addonItemId,
                addonName: a.addon_item?.name || a.addonName || 'Add-on',
                quantity: a.quantity,
                unitPrice: a.unitPrice,
                subtotal: a.subtotal
              }))
            }
          })
        }))
        
        // Filter out completed and paid orders (they go to Sales page)
        const activeOrders = ordersWithNames.filter(
          order => !(order.status === 'COMPLETED' && order.paymentStatus === 'PAID')
        )
        
        setOrders(activeOrders)
      } catch (error) {
        console.error('Failed to fetch orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [menuItemsLoaded, menuItems])

  // Handle updated order from POS
  useEffect(() => {
    if (location.state?.updatedOrder) {
      const updatedOrder = location.state.updatedOrder
      setOrders(prev => prev.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ))
      // Clear the state
      window.history.replaceState({}, document.title)
      toast.success('Order Updated', 'Order updated successfully!')
    }
  }, [location.state])

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(() => Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    PREPARING: { label: 'Preparing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
    READY: { label: 'Ready', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: CheckCircle },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  }

  // Payment status configuration
  const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; icon: any }> = {
    UNPAID: { label: 'Unpaid', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: DollarSign },
    PAID: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    REFUNDED: { label: 'Refunded', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: DollarSign },
    COMPLIMENTARY: { label: 'Complimentary', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: Gift },
    WRITTEN_OFF: { label: 'Written Off', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileX },
    VOIDED: { label: 'Voided', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban },
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      // Get the updated order from API response (includes processedBy when completed)
      const updatedOrder = await ordersApi.updateStatus(orderId, newStatus)
      
      // When marking as COMPLETED, also mark non-voided order items as COMPLETED
      if (newStatus === 'COMPLETED') {
        try {
          // Only mark items that are not VOIDED
          await ordersApi.markAllItemsCompleted(orderId)
        } catch (itemError) {
          console.error('Failed to mark items as completed:', itemError)
        }
      }
      
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: newStatus, 
              completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : order.completedAt,
              processedBy: updatedOrder.processedBy || order.processedBy,
              // Update only non-VOIDED items to COMPLETED if order is completed
              items: newStatus === 'COMPLETED' 
                ? order.items.map(item => ({ 
                    ...item, 
                    status: item.status === 'VOIDED' ? 'VOIDED' as const : 'COMPLETED' as const 
                  }))
                : order.items
            }
          : order
      ))
    } catch (error: any) {
      console.error('Failed to update order status:', error)
      toast.error('Update Failed', `Failed to update order status: ${error.response?.data?.error || error.message}`)
    }
  }

  const markAsPaid = async (orderId: string) => {
    try {
      await ordersApi.update(orderId, { paymentStatus: 'PAID' })
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, paymentStatus: 'PAID' }
          : order
      ))
      // Update selected order if it's the one being paid
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: 'PAID' })
      }
    } catch (error: any) {
      console.error('Failed to update payment status:', error)
      toast.error('Update Failed', `Failed to update payment status: ${error.response?.data?.error || error.message}`)
    }
  }

  const updatePaymentMethod = async () => {
    if (!selectedOrder || !selectedPaymentMethod) return
    
    try {
      await ordersApi.update(selectedOrder.id, { paymentMethod: selectedPaymentMethod })
      
      // Update orders list
      setOrders(prev => prev.map(order => 
        order.id === selectedOrder.id ? { ...order, paymentMethod: selectedPaymentMethod } : order
      ))
      
      // Update selectedOrder
      setSelectedOrder({ ...selectedOrder, paymentMethod: selectedPaymentMethod })
      
      setShowPaymentMethodModal(false)
      toast.success('Payment Method Updated', 'Payment method updated successfully')
    } catch (error: any) {
      console.error('Failed to update payment method:', error)
      toast.error('Update Failed', `Failed to update payment method: ${error.response?.data?.error || error.message}`)
    }
  }

  // ============ Manager Authorization Actions ============
  
  // Start action that requires manager authorization
  const startAuthorizedAction = (type: 'void' | 'refund' | 'complimentary' | 'writeOff' | 'voidAndReorder' | 'voidItem', orderId: string, order?: Order, itemId?: string, itemName?: string) => {
    setPendingAction({ type, orderId, order, itemId, itemName })
    setActionReason('')
    setShowReasonModal(true)
    setOpenMoreActionsId(null)
  }

  // Handle reason submission and open PIN modal
  const handleReasonSubmit = () => {
    if (!actionReason.trim()) {
      toast.warning('Reason Required', 'Please enter a reason for this action')
      return
    }
    setShowReasonModal(false)
    setShowManagerPinModal(true)
  }

  // Execute the pending action after manager authorization
  // This handles both single order actions and master linked order actions
  const executePendingAction = async (managerId: string, managerName: string) => {
    // Handle master linked order actions first
    if (masterLinkedAction) {
      await executeMasterLinkedAction(managerId, managerName)
      setShowManagerPinModal(false)
      return
    }
    
    if (!pendingAction) return

    try {
      const { type, orderId, order, itemId, itemName } = pendingAction

      switch (type) {
        case 'void':
          await ordersApi.voidOrder(orderId, actionReason, managerId)
          // Voided orders become CANCELLED status
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED', paymentStatus: 'VOIDED', notes: actionReason, authorizedBy: managerId } : o))
          toast.success('Order Voided', `Order voided successfully. Authorized by: ${managerName}`)
          break

        case 'refund':
          await ordersApi.refundOrder(orderId, actionReason, managerId)
          // Refunded orders become COMPLETED status
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', paymentStatus: 'REFUNDED', notes: actionReason, authorizedBy: managerId } : o))
          toast.success('Order Refunded', `Order refunded successfully. Authorized by: ${managerName}`)
          break

        case 'complimentary':
          await ordersApi.markAsComplimentary(orderId, actionReason, managerId)
          // Complimentary orders become COMPLETED status
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', paymentStatus: 'COMPLIMENTARY', notes: actionReason, authorizedBy: managerId } : o))
          toast.success('Complimentary Order', `Order marked as complimentary. Authorized by: ${managerName}`)
          break

        case 'writeOff':
          await ordersApi.writeOff(orderId, actionReason, managerId)
          // Written off orders (non-payment) become COMPLETED status
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', paymentStatus: 'WRITTEN_OFF', notes: actionReason, authorizedBy: managerId } : o))
          toast.success('Order Written Off', `Order written off. Authorized by: ${managerName}`)
          break

        case 'voidItem':
          if (itemId) {
            await ordersApi.voidOrderItem(orderId, itemId, actionReason, managerId)
            // Update local state - mark item as voided and update total
            setOrders(prev => prev.map(o => {
              if (o.id === orderId) {
                const updatedItems = o.items.map(item => 
                  item.id === itemId ? { ...item, status: 'VOIDED' as const } : item
                )
                // Recalculate total excluding voided items
                const itemsTotal = updatedItems
                  .filter(item => item.status !== 'VOIDED')
                  .reduce((sum, item) => sum + item.subtotal, 0)
                // Calculate subtotal and tax (tax is 12% of subtotal, so subtotal = itemsTotal / 1.12)
                const newSubtotal = itemsTotal / 1.12
                const newTax = itemsTotal - newSubtotal
                return { ...o, items: updatedItems, totalAmount: itemsTotal, subtotal: newSubtotal, tax: newTax }
              }
              return o
            }))
            // Also update selectedOrder if it's the same order
            if (selectedOrder?.id === orderId) {
              const updatedItems = selectedOrder.items.map(item => 
                item.id === itemId ? { ...item, status: 'VOIDED' as const } : item
              )
              const itemsTotal = updatedItems
                .filter(item => item.status !== 'VOIDED')
                .reduce((sum, item) => sum + item.subtotal, 0)
              const newSubtotal = itemsTotal / 1.12
              const newTax = itemsTotal - newSubtotal
              setSelectedOrder({ ...selectedOrder, items: updatedItems, totalAmount: itemsTotal, subtotal: newSubtotal, tax: newTax })
            }
            toast.success('Item Voided', `Item "${itemName}" voided successfully. Authorized by: ${managerName}`)
          }
          break

        case 'voidAndReorder':
          // First void the order
          await ordersApi.voidOrder(orderId, actionReason, managerId)
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED', paymentStatus: 'VOIDED', notes: actionReason, authorizedBy: managerId } : o))
          
          // Then navigate to POS with order items pre-filled
          if (order) {
            navigate('/admin/pos', { state: { reorderFrom: order, linkedOrderId: orderId } })
          }
          break
      }

      // Reset state
      setPendingAction(null)
      setActionReason('')
      
      // Close order details modal if open (except for voidItem which keeps modal open)
      if (selectedOrder?.id === orderId && pendingAction.type !== 'voidItem') {
        setSelectedOrder(null)
      }
    } catch (error: any) {
      console.error(`Failed to execute ${pendingAction.type} action:`, error)
      toast.error('Action Failed', `Failed to ${pendingAction.type} order: ${error.response?.data?.error || error.message}`)
    }
  }

  // Cancel pending action
  const cancelPendingAction = () => {
    setPendingAction(null)
    setMasterLinkedAction(null)
    setActionReason('')
    setShowReasonModal(false)
    setShowManagerPinModal(false)
  }

  // ============ End Manager Authorization Actions ============

  // Toggle order selection for link
  const toggleOrderForLink = (orderId: string) => {
    setSelectedOrdersForLink(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Link selected orders together
  const handleLinkOrders = async () => {
    if (selectedOrdersForLink.size < 2) {
      toast.warning('Selection Required', 'Please select at least 2 orders to link')
      return
    }

    try {
      const orderIds = Array.from(selectedOrdersForLink)
      // Get the first order as the parent (main order)
      const parentOrderId = orderIds[0]
      const childOrderIds = orderIds.slice(1)
      
      // Update each child order to have linkedOrderId pointing to parent
      for (const childId of childOrderIds) {
        await ordersApi.update(childId, { linkedOrderId: parentOrderId })
      }
      
      // Update local state
      setOrders(prev => prev.map(o => 
        childOrderIds.includes(o.id) 
          ? { ...o, linkedOrderId: parentOrderId }
          : o
      ))
      
      // Reset link state
      setSelectedOrdersForLink(new Set())
      setLinkMode(false)
      
      toast.success('Orders Linked', 'Orders linked successfully!')
    } catch (error: any) {
      console.error('Failed to link orders:', error)
      toast.error('Link Failed', `Failed to link orders: ${error.response?.data?.error || error.message}`)
    }
  }

  // Process merged order payment and print receipt
  const handleMergedPayment = async () => {
    if (!mergedOrderData) return

    try {
      await ordersApi.markMergedOrdersAsPaid(mergedOrderData.mergedOrderIds, mergePaymentMethod)
      
      // Print merged receipt
      printMergedReceipt()
      
      // Remove merged orders from list (they're now paid)
      setOrders(prev => prev.filter(o => !mergedOrderData.mergedOrderIds.includes(o.id)))
      
      // Reset merge state
      setShowMergeModal(false)
      setMergedOrderData(null)
      setSelectedOrdersForLink(new Set())
      setLinkMode(false)
      
      toast.success('Payment Successful', 'Orders merged and paid successfully!')
    } catch (error: any) {
      console.error('Failed to process merged payment:', error)
      toast.error('Payment Failed', `Failed to process payment: ${error.response?.data?.error || error.message}`)
    }
  }

  // Print merged receipt
  const printMergedReceipt = () => {
    if (!mergedOrderData) return

    const receiptHTML = generateMergedReceiptHTML({
      orderNumbers: mergedOrderData.orderNumbers,
      customerName: mergedOrderData.customerName || undefined,
      tableNumber: mergedOrderData.tableNumber || undefined,
      orderType: mergedOrderData.orderType,
      paymentMethod: mergePaymentMethod,
      items: mergedOrderData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: mergedOrderData.totalAmount
    })

    printWithIframe(receiptHTML)
  }

  // const updateOrderItems = (orderId: string, items: OrderItem[]) => {
  //   setOrders(prev => prev.map(order => {
  //     if (order.id === orderId) {
  //       const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  //       return { ...order, items, totalAmount }
  //     }
  //     return order
  //   }))
  // }

  const handleEditOrder = (order: Order) => {
    if (order.status === 'PENDING') {
      navigate('/admin/pos', { state: { editingOrder: order } })
    }
  }

  // Navigate to POS with EMPTY cart to create a linked order (additional items)
  // The new order will be linked to the original order but won't duplicate items
  const handleAddLinkedOrder = (order: Order) => {
    navigate('/admin/pos', { 
      state: { 
        linkToOrder: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          orderType: order.orderType
        }
      } 
    })
  }

  // Navigate to POS to add more items to an existing TAB ORDER (UNPAID)
  // Items will be added directly to this order, not creating a new linked order
  const handleAddToTab = (order: Order) => {
    navigate('/admin/pos', { 
      state: { 
        addToTab: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          existingItems: order.items
        }
      } 
    })
  }

  // Handler for Mark Paid & Print button - shows cash modal for CASH payments if enabled
  const handleMarkPaidAndPrint = (order: Order) => {
    if (order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID' && cashChangeEnabled) {
      setCashModalOrder(order)
      setCashModalMarkPaid(true)
      setShowCashModal(true)
    } else {
      printReceiptWithPayment(order, true)
    }
  }

  // Handler for Mark as Paid button - shows cash modal for CASH payments if enabled
  const handleMarkAsPaidButton = (order: Order) => {
    if (order.paymentMethod === 'CASH' && cashChangeEnabled) {
      setCashModalOrder(order)
      setCashModalMarkPaid(false)
      setShowCashModal(true)
    } else {
      markAsPaid(order.id)
    }
  }

  // Handler for cash modal confirmation
  const handleCashConfirm = async (cashReceived: number, changeAmount: number) => {
    if (!cashModalOrder) return
    
    setShowCashModal(false)
    
    try {
      // Update order with cash received and change
      await ordersApi.update(cashModalOrder.id, {
        cashReceived,
        changeAmount,
        paymentStatus: 'PAID'
      })
      
      // If print was requested, print the receipt with cash info
      if (cashModalMarkPaid) {
        printReceiptWithPayment(cashModalOrder, false, cashReceived, changeAmount)
      }
      
      // Refresh orders
      await refreshOrders()
    } catch (error) {
      console.error('Failed to update order payment:', error)
      toast.error('Update Failed', 'Failed to update payment status')
    }
    
    setCashModalOrder(null)
    setCashModalMarkPaid(false)
  }

  const printReceiptWithPayment = async (order: Order, markPaidFirst: boolean = false, cashReceived?: number, changeAmount?: number) => {
    // Mark as paid first if requested (from "Mark Paid & Print" button)
    if (markPaidFirst && order.paymentStatus !== 'PAID') {
      await markAsPaid(order.id)
    }

    // Filter out voided items for receipt
    const validItems = order.items.filter(item => item.status !== 'VOIDED')
    // Use item.subtotal which includes addon prices
    const validTotal = validItems.reduce((sum, item) => sum + item.subtotal, 0)

    const receiptHTML = generateReceiptHTML({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customerName || undefined,
      tableNumber: order.tableNumber || undefined,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod || undefined,
      items: validItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        status: item.status,
        variantName: item.variantName || undefined,
        variantPriceDelta: item.variantPriceDelta,
        notes: item.notes || undefined,
        addons: item.addons?.map(a => ({
          addonName: a.addonName,
          quantity: a.quantity,
          addonPrice: a.unitPrice,
          subtotal: a.subtotal
        }))
      })),
      totalAmount: validTotal,
      deliveryFee: (order as any).deliveryFee,
      serviceFee: (order as any).serviceFee,
      discountAmount: order.discountAmount,
      cashReceived: cashReceived || (order as any).cashReceived,
      changeAmount: changeAmount || (order as any).changeAmount
    })

    printWithIframe(receiptHTML)
  }

  const printReceipt = async (order: Order, markPaidFirst: boolean = false) => {
    // Mark as paid first if requested (from "Mark Paid & Print" button)
    if (markPaidFirst && order.paymentStatus !== 'PAID') {
      await markAsPaid(order.id)
    }

    // Filter out voided items for receipt
    const validItems = order.items.filter(item => item.status !== 'VOIDED')
    // Use item.subtotal which includes addon prices
    const validTotal = validItems.reduce((sum, item) => sum + item.subtotal, 0)

    const receiptHTML = generateReceiptHTML({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customerName || undefined,
      tableNumber: order.tableNumber || undefined,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod || undefined,
      items: validItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        status: item.status,
        variantName: item.variantName || undefined,
        variantPriceDelta: item.variantPriceDelta,
        notes: item.notes || undefined,
        addons: item.addons?.map(a => ({
          addonName: a.addonName,
          quantity: a.quantity,
          addonPrice: a.unitPrice,
          subtotal: a.subtotal
        }))
      })),
      totalAmount: validTotal,
      deliveryFee: (order as any).deliveryFee,
      serviceFee: (order as any).serviceFee,
      discountAmount: order.discountAmount,
      cashReceived: (order as any).cashReceived,
      changeAmount: (order as any).changeAmount
    })

    printWithIframe(receiptHTML)
  }

  // ============ Linked Orders Functions ============
  
  // Get all orders linked to a parent order (including the parent)
  const getLinkedOrderGroup = (parentOrderId: string): Order[] => {
    const parent = orders.find(o => o.id === parentOrderId)
    if (!parent) return []
    
    const linkedOrders = orders.filter(o => o.linkedOrderId === parentOrderId)
    return [parent, ...linkedOrders]
  }

  // Get the parent order for a linked order
  const getParentOrder = (order: Order): Order | null => {
    if (!order.linkedOrderId) return null
    return orders.find(o => o.id === order.linkedOrderId) || null
  }
  // Silence unused warning - used in template
  void getParentOrder

  // Check if an order is a parent with linked orders
  const hasLinkedOrders = (orderId: string): boolean => {
    return orders.some(o => o.linkedOrderId === orderId)
  }
  // Silence unused warning - used in template
  void hasLinkedOrders

  // Calculate combined total for linked orders
  const getLinkedOrdersTotal = (parentOrderId: string): number => {
    const group = getLinkedOrderGroup(parentOrderId)
    return group.reduce((sum, o) => sum + o.totalAmount, 0)
  }

  // Mark all linked orders as paid
  const markAllLinkedOrdersAsPaid = async (parentOrderId: string) => {
    const group = getLinkedOrderGroup(parentOrderId)
    try {
      for (const order of group) {
        if (order.paymentStatus !== 'PAID') {
          await ordersApi.update(order.id, { paymentStatus: 'PAID' })
        }
      }
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === parentOrderId || order.linkedOrderId === parentOrderId
          ? { ...order, paymentStatus: 'PAID' }
          : order
      ))
      toast.success('Payment Complete', 'All linked orders marked as paid!')
    } catch (error) {
      console.error('Failed to mark linked orders as paid:', error)
      toast.error('Payment Failed', 'Failed to mark some orders as paid')
    }
  }

  // ============ Master Linked Orders Actions ============
  
  // State for master linked order actions
  const [masterLinkedAction, setMasterLinkedAction] = useState<{
    type: 'void' | 'voidAndReorder' | 'complimentary' | 'writeOff'
    parentOrderId: string
    orders: Order[]
  } | null>(null)

  // Start a master action that affects all linked orders
  const startMasterLinkedAction = (type: 'void' | 'voidAndReorder' | 'complimentary' | 'writeOff', parentOrderId: string) => {
    const group = getLinkedOrderGroup(parentOrderId)
    setMasterLinkedAction({ type, parentOrderId, orders: group })
    setActionReason('')
    setShowReasonModal(true)
    setOpenMoreActionsId(null)
  }

  // Execute master action for all linked orders after manager authorization
  const executeMasterLinkedAction = async (managerId: string, managerName: string) => {
    if (!masterLinkedAction) return

    try {
      const { type, orders: linkedOrders } = masterLinkedAction
      
      for (const order of linkedOrders) {
        switch (type) {
          case 'void':
            await ordersApi.voidOrder(order.id, actionReason, managerId)
            break
          case 'voidAndReorder':
            await ordersApi.voidOrder(order.id, actionReason, managerId)
            break
          case 'complimentary':
            await ordersApi.markAsComplimentary(order.id, actionReason, managerId)
            // Also update status to COMPLETED
            await ordersApi.update(order.id, { status: 'COMPLETED' })
            break
          case 'writeOff':
            await ordersApi.writeOff(order.id, actionReason, managerId)
            // Also update status to COMPLETED
            await ordersApi.update(order.id, { status: 'COMPLETED' })
            break
        }
      }

      // Update local state based on action type
      setOrders(prev => prev.map(o => {
        if (linkedOrders.some(lo => lo.id === o.id)) {
          if (type === 'void' || type === 'voidAndReorder') {
            return { ...o, status: 'CANCELLED', paymentStatus: 'VOIDED', notes: actionReason, authorizedBy: managerId }
          } else if (type === 'complimentary') {
            return { ...o, status: 'COMPLETED', paymentStatus: 'COMPLIMENTARY', notes: actionReason, authorizedBy: managerId }
          } else if (type === 'writeOff') {
            return { ...o, status: 'COMPLETED', paymentStatus: 'WRITTEN_OFF', notes: actionReason, authorizedBy: managerId }
          }
        }
        return o
      }))

      // Navigate to POS for voidAndReorder with all items
      if (type === 'voidAndReorder') {
        // Combine all items from all linked orders
        const combinedItems = linkedOrders.flatMap(o => o.items)
        navigate('/admin/pos', { state: { reorderFrom: { ...linkedOrders[0], items: combinedItems } } })
      }

      const actionLabel = type === 'void' ? 'voided' : type === 'voidAndReorder' ? 'voided' : type === 'complimentary' ? 'marked as complimentary' : 'written off'
      toast.success('Linked Orders Updated', `All ${linkedOrders.length} linked orders ${actionLabel} successfully. Authorized by: ${managerName}`)
      
      // Reset state
      setMasterLinkedAction(null)
      setActionReason('')
      
    } catch (error: any) {
      console.error(`Failed to execute master ${masterLinkedAction.type} action:`, error)
      toast.error('Action Failed', `Failed to ${masterLinkedAction.type} orders: ${error.response?.data?.error || error.message}`)
    }
  }

  // Print combined receipt for linked orders
  const printLinkedOrdersReceipt = (parentOrderId: string) => {
    const group = getLinkedOrderGroup(parentOrderId)
    if (group.length === 0) return

    const parentOrder = group[0]
    
    // Calculate combined total excluding voided items
    let combinedTotal = 0
    const ordersWithValidItems: { orderNumber: string; items: ReceiptItem[]; totalAmount: number }[] = group.map(order => {
      const validItems = order.items.filter(item => item.status !== 'VOIDED')
      // Use item.subtotal which includes addon prices
      const validTotal = validItems.reduce((sum, item) => sum + item.subtotal, 0)
      combinedTotal += validTotal
      return {
        orderNumber: order.orderNumber,
        items: validItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          variantName: item.variantName || undefined,
          variantPriceDelta: item.variantPriceDelta,
          notes: item.notes || undefined,
          addons: item.addons?.map(a => ({
            addonName: a.addonName,
            quantity: a.quantity,
            addonPrice: a.unitPrice,
            subtotal: a.subtotal
          }))
        })) as ReceiptItem[],
        totalAmount: validTotal
      }
    })

    const receiptHTML = generateLinkedOrdersReceiptHTML({
      parentOrder: {
        orderNumber: parentOrder.orderNumber,
        customerName: parentOrder.customerName || undefined,
        tableNumber: parentOrder.tableNumber || undefined
      },
      orders: ordersWithValidItems,
      combinedSubtotal: combinedTotal,
      combinedTax: 0,
      combinedTotal
    })

    printWithIframe(receiptHTML)
  }

  // Get today's date for filtering cancelled orders
  const today = new Date().toISOString().split('T')[0]
  
  const filteredOrders = orders
    .filter(order => {
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        formatOrderNumber(order.orderNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      // Order type filter
      if (selectedOrderType !== 'all' && order.orderType !== selectedOrderType) {
        return false
      }

      // Exclude COMPLIMENTARY, WRITTEN_OFF, REFUNDED, VOIDED orders from Orders Page main views
      // VOIDED orders only show in cancelled category
      if (['COMPLIMENTARY', 'WRITTEN_OFF', 'REFUNDED', 'VOIDED'].includes(order.paymentStatus)) {
        // Exception: show VOIDED in cancelled category
        if (order.paymentStatus === 'VOIDED' && selectedStatus === 'cancelled') {
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
          return orderDate === today
        }
        return false
      }

      // Status filter logic
      switch (selectedStatus) {
        case 'all':
          // Exclude cancelled/voided orders from "all" view
          return order.status !== 'CANCELLED'
          
        case 'pending':
          return order.status === 'PENDING'
          
        case 'preparing':
          return order.status === 'PREPARING'
          
        case 'completed':
          return order.status === 'COMPLETED'
          
        case 'cancelled': {
          // Show cancelled orders from today only
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
          return order.status === 'CANCELLED' && orderDate === today
        }
          
        case 'tab':
          // Tab orders: unpaid orders that are PENDING or PREPARING (can still accumulate items)
          return order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
          
        case 'linked': {
          // Show orders that are part of a linked group (exclude VOIDED orders):
          // 1. Orders that have linkedOrderId (child orders) - but not if VOIDED
          // 2. Orders that are parents (have other orders linked to them) - but not if VOIDED
          if (order.paymentStatus === 'VOIDED') return false
          const isLinkedChild = order.linkedOrderId !== null
          const isLinkedParent = orders.some(o => o.linkedOrderId === order.id && o.status !== 'CANCELLED' && o.paymentStatus !== 'VOIDED')
          return isLinkedChild || isLinkedParent
        }
          
        default:
          return true
      }
    })
    // Sort by creation time only (most recent first) - stable ordering regardless of status changes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const minutes = Math.floor((currentTime - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const stats = {
    pending: orders.filter(o => o.status === 'PENDING').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  }

  // Helper to render a full order card for vertical layout (same as horizontal layout)
  const renderOrderCard = (order: Order, linkedOrders: Order[]) => {
    const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PREPARING
    const StatusIcon = statusInfo.icon
    const statusBorderColor = statusBorderColors[order.status as keyof typeof statusBorderColors] || 'border-l-gray-300'
    const hasLinks = linkedOrders.length > 0
    const isSelectedForLink = selectedOrdersForLink.has(order.id)
    const canLink = order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED'
    
    return (
      <div 
        key={order.id}
        className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${statusBorderColor} p-4 hover:shadow-md transition-all ${
          isSelectedForLink ? 'ring-2 ring-blue-400 bg-blue-50' : ''
        }`}
        onClick={linkMode && canLink ? () => toggleOrderForLink(order.id) : undefined}
        style={{ cursor: linkMode && canLink ? 'pointer' : 'default' }}
      >
        <div className="flex flex-col gap-3">
          {/* Link Checkbox */}
          {linkMode && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSelectedForLink}
                onChange={() => canLink && toggleOrderForLink(order.id)}
                disabled={!canLink}
                className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          )}
          
          {/* Order Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">{formatOrderNumber(order.orderNumber)}</h3>
              <Badge className={`${statusInfo.color} border text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              {hasLinks && (
                <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                  <Link2 className="h-3 w-3 mr-0.5" />+{linkedOrders.length}
                </Badge>
              )}
              {order.tableNumber && (
                <Badge variant="outline" className="text-xs">
                  Table {order.tableNumber}
                </Badge>
              )}
              {order.orderType && (
                <Badge variant="outline" className="text-xs">
                  {order.orderType === 'DINE_IN' ? 'Dine-In' : 
                   order.orderType === 'TAKEOUT' ? 'Takeout' : 'Delivery'}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Customer:</span> {order.customerName}
              </p>
              {/* Items with status icons */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">Items:</span>
                <div className="mt-1 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className={`${item.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        {item.status === 'VOIDED' ? (
                          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                        ) : item.status === 'COMPLETED' ? (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <ChefHat className="h-3 w-3 text-blue-500 shrink-0" />
                        )}
                        <span className={`flex-1 truncate ${item.status === 'VOIDED' ? 'line-through' : ''}`}>
                          {item.name}
                          {item.variantName && <span className="text-amber-600 ml-1">({item.variantName})</span>}
                          {' '}(x{item.quantity})
                        </span>
                        {item.status !== 'VOIDED' && order.status !== 'COMPLETED' && order.paymentStatus === 'UNPAID' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startAuthorizedAction('voidItem', order.id, order, item.id, item.name)
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Void this item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      </div>
                      {/* Addons */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="ml-6 text-xs text-gray-500">
                          {item.addons.map((addon, addonIdx) => (
                            <div key={addonIdx}>+ {addon.addonName} x{addon.quantity}</div>
                          ))}
                        </div>
                      )}
                      {/* Notes */}
                      {item.notes && (
                        <div className="ml-6 text-xs text-gray-400 italic">Note: {item.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{getTimeAgo(order.createdAt)}</span>
                <span>•</span>
                <span className="font-semibold" style={{ color: '#F9C900' }}>
                  ₱{order.totalAmount.toFixed(2)}
                </span>
                <Badge className={`text-xs ${paymentStatusConfig[order.paymentStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                  {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                </Badge>
                {order.paymentStatus === 'UNPAID' && !order.linkedOrderId && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tab
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {/* PENDING Orders */}
            {order.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleEditOrder(order)}
                  variant="outline"
                  className="text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                  className="text-xs"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  Start Preparing
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                    }}
                    className="text-xs px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                  {openMoreActionsId === order.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PREPARING Orders - Unpaid */}
            {order.status === 'PREPARING' && order.paymentStatus === 'UNPAID' && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                  className="text-xs"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddToTab(order)}
                  variant="outline"
                  className="text-xs border-green-300 text-green-600 hover:bg-green-50"
                >
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                    }}
                    className="text-xs px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                  {openMoreActionsId === order.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                      <button
                        onClick={() => startAuthorizedAction('void', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 first:rounded-t-lg"
                      >
                        <Ban className="h-3 w-3" />
                        Void Order
                      </button>
                      <button
                        onClick={() => handleAddLinkedOrder(order)}
                        className="w-full px-3 py-2 text-left text-xs text-green-600 hover:bg-green-50 flex items-center gap-2"
                      >
                        <Link2 className="h-3 w-3" />
                        Add Linked Order
                      </button>
                      <button
                        onClick={() => startAuthorizedAction('voidAndReorder', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Void & Re-order
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PREPARING Orders - Already Paid */}
            {order.status === 'PREPARING' && order.paymentStatus === 'PAID' && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                  className="text-xs"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  Complete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                    }}
                    className="text-xs px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                  {openMoreActionsId === order.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                      <button
                        onClick={() => startAuthorizedAction('refund', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2 rounded-lg"
                      >
                        <DollarSign className="h-3 w-3" />
                        Void & Refund
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* COMPLETED Orders - Unpaid */}
            {order.status === 'COMPLETED' && order.paymentStatus === 'UNPAID' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleMarkPaidAndPrint(order)}
                  className="text-xs flex items-center gap-1"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  <Printer className="h-3 w-3" />
                  Paid & Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAsPaidButton(order)}
                  className="text-xs border-green-300 text-green-600 hover:bg-green-50"
                >
                  <DollarSign className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddToTab(order)}
                  variant="outline"
                  className="text-xs border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                    }}
                    className="text-xs px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                  {openMoreActionsId === order.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                      <button
                        onClick={() => startAuthorizedAction('complimentary', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-pink-600 hover:bg-pink-50 flex items-center gap-2 first:rounded-t-lg"
                      >
                        <Gift className="h-3 w-3" />
                        Complimentary
                      </button>
                      <button
                        onClick={() => startAuthorizedAction('writeOff', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FileX className="h-3 w-3" />
                        Non-Payment
                      </button>
                      <button
                        onClick={() => startAuthorizedAction('void', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Ban className="h-3 w-3" />
                        Void Order
                      </button>
                      <button
                        onClick={() => printReceipt(order)}
                        className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Printer className="h-3 w-3" />
                        Print Bill
                      </button>
                      <button
                        onClick={() => handleAddLinkedOrder(order)}
                        className="w-full px-3 py-2 text-left text-xs text-green-600 hover:bg-green-50 flex items-center gap-2 last:rounded-b-lg"
                      >
                        <Link2 className="h-3 w-3" />
                        Add Linked Order
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* COMPLETED Orders - Paid */}
            {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printReceipt(order)}
                  className="text-xs flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" />
                  Print
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                    }}
                    className="text-xs px-2"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                  {openMoreActionsId === order.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                      <button
                        onClick={() => startAuthorizedAction('refund', order.id, order)}
                        className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2 rounded-lg"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Void & Refund
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CANCELLED Orders */}
            {order.status === 'CANCELLED' && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="text-xs px-2">
                  <Eye className="h-3 w-3" />
                  View Details
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout 
      hideHeaderOnDesktop={!showHeaderInOrdersPage}
      showOverviewInHeader={showOverviewInHeaderOrdersPage}
      overviewCounts={stats}
    >
      <div className="space-y-4">
        {/* Overview in Header - shown when header is hidden but overview in header is enabled */}
        {!showHeaderInOrdersPage && showOverviewInHeaderOrdersPage && (
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-100 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <span className="text-sm font-semibold text-yellow-600">{stats.pending}</span>
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-blue-600">{stats.preparing}</span>
              <span className="text-xs text-gray-500">Preparing</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-green-600">{stats.completed}</span>
              <span className="text-xs text-gray-500">Completed</span>
            </div>
          </div>
        )}
        
        {/* Stats Cards - Conditionally visible */}
        {showOverviewCardsInOrdersPage && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Preparing</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.preparing}</p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search and Actions */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order number or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Actions: Link Orders + Grid Toggle */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Link Orders */}
                {linkMode ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                      {selectedOrdersForLink.size} selected
                    </Badge>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleLinkOrders}
                      disabled={selectedOrdersForLink.size < 2}
                      className="whitespace-nowrap bg-blue-500 hover:bg-blue-600"
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLinkMode(false)
                        setSelectedOrdersForLink(new Set())
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkMode(true)}
                    className="whitespace-nowrap"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Link Orders
                  </Button>
                )}

                {/* Grid Layout Toggle */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                  <button
                    onClick={() => setGridColumns(1)}
                    className={`p-1.5 rounded ${gridColumns === 1 ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="List view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridColumns(2)}
                    className={`p-1.5 rounded ${gridColumns === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="2 columns"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridColumns(3)}
                    className={`p-1.5 rounded ${gridColumns === 3 ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="3 columns"
                  >
                    <span className="text-xs font-bold">3</span>
                  </button>
                  <button
                    onClick={() => setGridColumns(4)}
                    className={`p-1.5 rounded ${gridColumns === 4 ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="4 columns"
                  >
                    <span className="text-xs font-bold">4</span>
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  {/* Separator Direction Buttons */}
                  <button
                    onClick={() => setStatusSeparatorDirection(statusSeparatorDirection === 'horizontal' ? 'off' : 'horizontal')}
                    className={`p-1.5 rounded ${statusSeparatorDirection === 'horizontal' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Horizontal separator (grouped rows)"
                  >
                    <Rows3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setStatusSeparatorDirection(statusSeparatorDirection === 'vertical' ? 'off' : 'vertical')}
                    className={`p-1.5 rounded ${statusSeparatorDirection === 'vertical' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Vertical separator (3 columns by status)"
                  >
                    <Columns3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
                className="whitespace-nowrap"
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('pending')}
                className="whitespace-nowrap relative"
              >
                Pending
                {orders.some(o => o.status === 'PENDING') && selectedStatus !== 'pending' && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </Button>
              <Button
                variant={selectedStatus === 'preparing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('preparing')}
                className="whitespace-nowrap"
              >
                Preparing
              </Button>
              <Button
                variant={selectedStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('completed')}
                className="whitespace-nowrap"
              >
                Completed
              </Button>
              
              {/* Divider */}
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Tab Orders filter - shows orders that are unpaid and can accumulate items */}
              <Button
                variant={selectedStatus === 'tab' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('tab')}
                className="whitespace-nowrap text-orange-600 relative"
              >
                📋 Tab Orders
                {orders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length > 0 && selectedStatus !== 'tab' && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                )}
              </Button>
              <Button
                variant={selectedStatus === 'linked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('linked')}
                className="whitespace-nowrap text-blue-600 relative"
              >
                🔗 Linked
                {orders.some(o => o.paymentStatus !== 'VOIDED' && (o.linkedOrderId !== null || orders.some(ord => ord.linkedOrderId === o.id && ord.paymentStatus !== 'VOIDED'))) && selectedStatus !== 'linked' && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </Button>
              <Button
                variant={selectedStatus === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('cancelled')}
                className="whitespace-nowrap text-red-600 hover:text-red-700"
              >
                Cancelled
              </Button>
              
              {/* Divider */}
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Order Type filters */}
              <Button
                variant={selectedOrderType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOrderType('all')}
                className="whitespace-nowrap"
              >
                All Types
              </Button>
              <Button
                variant={selectedOrderType === 'DINE_IN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOrderType('DINE_IN')}
                className="whitespace-nowrap"
              >
                🍽️ Dine In
              </Button>
              <Button
                variant={selectedOrderType === 'TAKEOUT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOrderType('TAKEOUT')}
                className="whitespace-nowrap"
              >
                🥡 Takeout
              </Button>
              <Button
                variant={selectedOrderType === 'DELIVERY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOrderType('DELIVERY')}
                className="whitespace-nowrap"
              >
                🚗 Delivery
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List - with optional status separators */}
        <div className={`grid gap-3 ${
          gridColumns === 1 ? 'grid-cols-1' :
          gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' :
          gridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {loading ? (
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center ${gridColumns > 1 ? 'col-span-full' : ''}`}>
              <Loader2 className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center ${gridColumns > 1 ? 'col-span-full' : ''}`}>
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            // Group linked orders together
            (() => {
              // Build groups: orders without linkedOrderId that have linked children, plus standalone orders
              const processedIds = new Set<string>()
              const orderGroups: { parent: Order; children: Order[] }[] = []
              
              // First, find all parent orders (orders that have children linked to them)
              filteredOrders.forEach(order => {
                if (processedIds.has(order.id)) return
                
                // Check if this order has linked children
                const linkedChildren = filteredOrders.filter(o => {
                  if (o.linkedOrderId !== order.id) return false
                  // Exclude void & reorder cases (where linked order's parent is cancelled/voided)
                  const isVoidAndReorder = order.status === 'CANCELLED' || order.paymentStatus === 'VOIDED'
                  return !isVoidAndReorder
                })
                
                if (linkedChildren.length > 0) {
                  // This is a parent with linked orders
                  orderGroups.push({ parent: order, children: linkedChildren })
                  processedIds.add(order.id)
                  linkedChildren.forEach(c => processedIds.add(c.id))
                }
              })
              
              // Then add standalone orders (not linked and not parents)
              filteredOrders.forEach(order => {
                if (processedIds.has(order.id)) return
                
                // Check if this is a linked child that we should skip (already rendered with parent)
                if (order.linkedOrderId) {
                  const parentOrder = filteredOrders.find(o => o.id === order.linkedOrderId)
                  const isVoidAndReorder = parentOrder?.status === 'CANCELLED' || parentOrder?.paymentStatus === 'VOIDED'
                  if (!isVoidAndReorder && parentOrder) {
                    // Skip - will be rendered with parent
                    return
                  }
                }
                
                orderGroups.push({ parent: order, children: [] })
                processedIds.add(order.id)
              })

              // Sort by status when status separator is enabled: PENDING -> PREPARING -> READY -> COMPLETED -> CANCELLED
              const statusOrder = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']
              const sortedGroups = statusSeparatorDirection !== 'off' 
                ? [...orderGroups].sort((a, b) => {
                    const aIndex = statusOrder.indexOf(a.parent.status)
                    const bIndex = statusOrder.indexOf(b.parent.status)
                    if (aIndex !== bIndex) return aIndex - bIndex
                    // Within same status, sort by creation time (most recent first)
                    return new Date(b.parent.createdAt).getTime() - new Date(a.parent.createdAt).getTime()
                  })
                : orderGroups

              // Track current status for separator rendering
              let currentStatus = ''
              
              // Status separator config
              const statusSeparatorConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: typeof Clock }> = {
                PENDING: { label: 'Pending Orders', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', icon: Clock },
                PREPARING: { label: 'Preparing', bgColor: 'bg-blue-100', textColor: 'text-blue-800', icon: Package },
                READY: { label: 'Ready for Pickup', bgColor: 'bg-purple-100', textColor: 'text-purple-800', icon: CheckCircle },
                COMPLETED: { label: 'Completed', bgColor: 'bg-green-100', textColor: 'text-green-800', icon: CheckCircle },
                CANCELLED: { label: 'Cancelled', bgColor: 'bg-red-100', textColor: 'text-red-800', icon: XCircle },
              }

              // Vertical layout: 3 columns by status (Pending | Preparing | Completed)
              if (statusSeparatorDirection === 'vertical') {
                const pendingGroups = sortedGroups.filter(g => g.parent.status === 'PENDING')
                const preparingGroups = sortedGroups.filter(g => g.parent.status === 'PREPARING')
                const completedGroups = sortedGroups.filter(g => g.parent.status === 'COMPLETED' || g.parent.status === 'READY' || g.parent.status === 'CANCELLED')
                
                return (
                  <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Pending Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 sticky top-0 z-10">
                        <Clock className="h-4 w-4 text-yellow-700" />
                        <span className="font-semibold text-sm text-yellow-800">Pending</span>
                        <Badge className="bg-yellow-200 text-yellow-800 border-0">{pendingGroups.length}</Badge>
                      </div>
                      {pendingGroups.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No pending orders</div>
                      ) : pendingGroups.map(({ parent: order, children: linkedOrders }) => 
                        renderOrderCard(order, linkedOrders)
                      )}
                    </div>
                    
                    {/* Preparing Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 sticky top-0 z-10">
                        <Package className="h-4 w-4 text-blue-700" />
                        <span className="font-semibold text-sm text-blue-800">Preparing</span>
                        <Badge className="bg-blue-200 text-blue-800 border-0">{preparingGroups.length}</Badge>
                      </div>
                      {preparingGroups.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No orders preparing</div>
                      ) : preparingGroups.map(({ parent: order, children: linkedOrders }) => 
                        renderOrderCard(order, linkedOrders)
                      )}
                    </div>
                    
                    {/* Completed Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 sticky top-0 z-10">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                        <span className="font-semibold text-sm text-green-800">Completed</span>
                        <Badge className="bg-green-200 text-green-800 border-0">{completedGroups.length}</Badge>
                      </div>
                      {completedGroups.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No completed orders</div>
                      ) : completedGroups.map(({ parent: order, children: linkedOrders }) => 
                        renderOrderCard(order, linkedOrders)
                      )}
                    </div>
                  </div>
                )
              }

              return sortedGroups.map(({ parent: order, children: linkedOrders }) => {
                const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PREPARING
                const StatusIcon = statusInfo.icon
                const isSelectedForLink = selectedOrdersForLink.has(order.id)
                const canLink = order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED'
                const statusBorderColor = statusBorderColors[order.status as keyof typeof statusBorderColors] || 'border-l-gray-300'
                const hasLinks = linkedOrders.length > 0
                const combinedTotal = hasLinks ? order.totalAmount + linkedOrders.reduce((sum, o) => sum + o.totalAmount, 0) : order.totalAmount
                const allPaid = hasLinks ? order.paymentStatus === 'PAID' && linkedOrders.every(o => o.paymentStatus === 'PAID') : order.paymentStatus === 'PAID'
                
                // Check if we need to render a status separator (horizontal mode)
                const showSeparator = statusSeparatorDirection === 'horizontal' && order.status !== currentStatus
                if (statusSeparatorDirection === 'horizontal') {
                  currentStatus = order.status
                }
                const separatorConfig = statusSeparatorConfig[order.status] || statusSeparatorConfig.PENDING
                const SeparatorIcon = separatorConfig.icon
                const ordersInStatus = sortedGroups.filter(g => g.parent.status === order.status).length
                
                // Render linked order group with special UI
                if (hasLinks) {
                  return (
                    <React.Fragment key={order.id}>
                      {showSeparator && (
                        <div className="col-span-full flex items-center gap-3 py-2">
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${separatorConfig.bgColor}`}>
                            <SeparatorIcon className={`h-4 w-4 ${separatorConfig.textColor}`} />
                            <span className={`font-semibold text-sm ${separatorConfig.textColor}`}>{separatorConfig.label}</span>
                            <Badge className={`${separatorConfig.bgColor} ${separatorConfig.textColor} border-0`}>{ordersInStatus}</Badge>
                          </div>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <div className="col-span-full">
                        {/* Linked Orders Container */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4">
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Link2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-blue-900">Linked Orders • {order.customerName}</h3>
                                <p className="text-sm text-blue-600">
                                  {linkedOrders.length + 1} orders combined • Table {order.tableNumber || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Combined Total</p>
                                <p className="text-2xl font-bold text-blue-700">₱{combinedTotal.toFixed(2)}</p>
                              </div>
                              {allPaid ? (
                                <Badge className="bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                All Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Unpaid
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Linked Order Cards */}
                        <div className="flex flex-wrap gap-3 mb-4">
                          {[order, ...linkedOrders].map((o, idx) => {
                            const oStatusInfo = statusConfig[o.status as keyof typeof statusConfig] || statusConfig.PREPARING
                            const OStatusIcon = oStatusInfo.icon
                            const oStatusBorderColor = statusBorderColors[o.status as keyof typeof statusBorderColors] || 'border-l-gray-300'
                            const linkedOrderMenuId = `linked-order-${o.id}`
                            
                            return (
                              <div 
                                key={o.id}
                                className={`flex-1 min-w-[300px] bg-white rounded-lg border border-gray-200 border-l-4 ${oStatusBorderColor} p-3`}
                              >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      {idx === 0 ? 'Main' : `+${idx}`}
                                    </span>
                                    <h4 className="font-bold text-gray-900">{formatOrderNumber(o.orderNumber)}</h4>
                                  </div>
                                  <Badge className={`${paymentStatusConfig[o.paymentStatus]?.color || 'bg-gray-100'} text-xs`}>
                                    {paymentStatusConfig[o.paymentStatus]?.label || o.paymentStatus}
                                  </Badge>
                                </div>
                                
                                {/* Items with status icons */}
                                <div className="space-y-1 mb-2">
                                  {o.items.slice(0, 3).map((item, itemIdx) => (
                                    <div key={itemIdx} className={`flex items-center gap-1.5 text-xs ${item.status === 'VOIDED' ? 'opacity-50 line-through' : ''}`}>
                                      {item.status === 'VOIDED' ? (
                                        <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                      ) : item.status === 'COMPLETED' ? (
                                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                      ) : (
                                        <ChefHat className="h-3 w-3 text-blue-500 shrink-0" />
                                      )}
                                      <span className="text-gray-600 truncate">{item.name}</span>
                                      <span className="text-gray-400">x{item.quantity}</span>
                                    </div>
                                  ))}
                                  {o.items.length > 3 && (
                                    <div className="text-xs text-gray-400">+{o.items.length - 3} more</div>
                                  )}
                                </div>
                                
                                {/* Price and Status */}
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold" style={{ color: '#F9C900' }}>
                                    ₱{o.totalAmount.toFixed(2)}
                                  </span>
                                  <Badge className={`${oStatusInfo.color} border text-xs`}>
                                    <OStatusIcon className="h-3 w-3 mr-1" />
                                    {oStatusInfo.label}
                                  </Badge>
                                </div>
                                
                                {/* Per-Order Controls - Contextual buttons based on status */}
                                <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                                  {/* PREPARING order - Show Mark Complete button */}
                                  {o.status === 'PREPARING' && (
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderStatus(o.id, 'COMPLETED')}
                                      className="flex-1 h-7 text-xs"
                                      style={{ backgroundColor: '#F9C900', color: '#000000' }}
                                    >
                                      ✅ Complete
                                    </Button>
                                  )}
                                  
                                  {/* COMPLETED + UNPAID - Show Mark Paid button */}
                                  {o.status === 'COMPLETED' && o.paymentStatus === 'UNPAID' && (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        await ordersApi.update(o.id, { paymentStatus: 'PAID' })
                                        setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, paymentStatus: 'PAID' } : ord))
                                      }}
                                      className="flex-1 h-7 text-xs"
                                      style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                                    >
                                      💰 Mark Paid
                                    </Button>
                                  )}
                                  
                                  {/* PENDING order - Show Start Preparing button */}
                                  {o.status === 'PENDING' && (
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderStatus(o.id, 'PREPARING')}
                                      className="flex-1 h-7 text-xs"
                                      style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}
                                    >
                                      👨‍🍳 Start
                                    </Button>
                                  )}
                                  
                                  {/* Status badge for COMPLETED + PAID */}
                                  {o.status === 'COMPLETED' && o.paymentStatus === 'PAID' && (
                                    <Badge className="flex-1 h-7 text-xs bg-green-100 text-green-700 justify-center">
                                      ✓ Done & Paid
                                    </Badge>
                                  )}
                                  
                                  {/* View button */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedOrder(o)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  
                                  {/* More button with dropdown */}
                                  <div className="relative">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenMoreActionsId(openMoreActionsId === linkedOrderMenuId ? null : linkedOrderMenuId)
                                      }}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                    
                                    {openMoreActionsId === linkedOrderMenuId && (
                                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                        {/* PREPARING orders - Void and Void & Reorder */}
                                        {o.status === 'PREPARING' && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setOpenMoreActionsId(null)
                                                startAuthorizedAction('void', o.id, o)
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 first:rounded-t-lg"
                                            >
                                              <Ban className="h-3 w-3" />
                                              Void Order
                                            </button>
                                            <button
                                              onClick={() => {
                                                setOpenMoreActionsId(null)
                                                startAuthorizedAction('voidAndReorder', o.id, o)
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                                            >
                                              <AlertTriangle className="h-3 w-3" />
                                              Void & Re-order
                                            </button>
                                          </>
                                        )}
                                        {/* COMPLETED orders - Complimentary, Write-off, Refund, Void & Reorder */}
                                        {o.status === 'COMPLETED' && o.paymentStatus === 'UNPAID' && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setOpenMoreActionsId(null)
                                                startAuthorizedAction('complimentary', o.id, o)
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs text-pink-600 hover:bg-pink-50 flex items-center gap-2 first:rounded-t-lg"
                                            >
                                              <Gift className="h-3 w-3" />
                                              Complimentary
                                            </button>
                                            <button
                                              onClick={() => {
                                                setOpenMoreActionsId(null)
                                                startAuthorizedAction('writeOff', o.id, o)
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                              <FileX className="h-3 w-3" />
                                              Non-Payment
                                            </button>
                                            <button
                                              onClick={() => {
                                                setOpenMoreActionsId(null)
                                                startAuthorizedAction('voidAndReorder', o.id, o)
                                              }}
                                              className="w-full px-3 py-2 text-left text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                                            >
                                              <AlertTriangle className="h-3 w-3" />
                                              Void & Re-order
                                            </button>
                                          </>
                                        )}
                                        {/* COMPLETED + PAID - Refund only */}
                                        {o.status === 'COMPLETED' && o.paymentStatus === 'PAID' && (
                                          <button
                                            onClick={() => {
                                              setOpenMoreActionsId(null)
                                              startAuthorizedAction('refund', o.id, o)
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2 rounded-lg"
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                            Void & Refund
                                          </button>
                                        )}
                                        {/* PENDING orders - Cancel only (not void since not confirmed) */}
                                        {o.status === 'PENDING' && (
                                          <button
                                            onClick={async () => {
                                              await updateOrderStatus(o.id, 'CANCELLED')
                                              setOpenMoreActionsId(null)
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                                          >
                                            <XCircle className="h-3 w-3" />
                                            Cancel Order
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Master Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-blue-200">
                          <div className="flex flex-wrap gap-2">
                            {/* Mark All Complete button */}
                            {[order, ...linkedOrders].some(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED') && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  // Mark all orders in the group as COMPLETED
                                  const allOrders = [order, ...linkedOrders]
                                  for (const o of allOrders) {
                                    if (o.status !== 'COMPLETED' && o.status !== 'CANCELLED') {
                                      await ordersApi.update(o.id, { status: 'COMPLETED' })
                                    }
                                  }
                                  setOrders(prev => prev.map(o => 
                                    allOrders.some(lo => lo.id === o.id) && o.status !== 'CANCELLED'
                                      ? { ...o, status: 'COMPLETED' }
                                      : o
                                  ))
                                }}
                                className="flex items-center gap-1"
                                style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Mark All Complete
                              </Button>
                            )}
                            {/* Mark All Paid button */}
                            {!allPaid && (
                              <Button
                                size="sm"
                                onClick={() => markAllLinkedOrdersAsPaid(order.id)}
                                className="flex items-center gap-1"
                                style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                              >
                                <DollarSign className="h-4 w-4" />
                                Mark All Paid
                              </Button>
                            )}
                            {/* Mark Paid & Print button - sets PREPARING if PENDING, marks paid, prints */}
                            <Button
                              size="sm"
                              onClick={async () => {
                                const allOrders = [order, ...linkedOrders]
                                // Update all orders: set to PREPARING if PENDING, mark as PAID
                                for (const o of allOrders) {
                                  const updates: { status?: OrderStatus; paymentStatus?: PaymentStatus } = { paymentStatus: 'PAID' }
                                  if (o.status === 'PENDING') {
                                    updates.status = 'PREPARING'
                                  }
                                  await ordersApi.update(o.id, updates)
                                }
                                setOrders(prev => prev.map(o => {
                                  if (allOrders.some(lo => lo.id === o.id)) {
                                    return { 
                                      ...o, 
                                      paymentStatus: 'PAID' as PaymentStatus,
                                      status: (o.status === 'PENDING' ? 'PREPARING' : o.status) as OrderStatus
                                    }
                                  }
                                  return o
                                }))
                                // Print combined receipt
                                printLinkedOrdersReceipt(order.id)
                              }}
                              className="flex items-center gap-1"
                              style={{ backgroundColor: '#059669', color: '#FFFFFF' }}
                            >
                              <Printer className="h-4 w-4" />
                              Mark Paid & Print
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printLinkedOrdersReceipt(order.id)}
                              className="flex items-center gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Printer className="h-4 w-4" />
                              Print Combined Bill
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddLinkedOrder(order)}
                              className="flex items-center gap-1 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <Link2 className="h-4 w-4" />
                              Add More Items
                            </Button>
                            
                            {/* More Actions for master linked order operations */}
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMoreActionsId(openMoreActionsId === `master_${order.id}` ? null : `master_${order.id}`)
                                }}
                                className="flex items-center gap-1"
                              >
                                <MoreVertical className="h-4 w-4" />
                                More
                              </Button>
                              
                              {openMoreActionsId === `master_${order.id}` && (
                                <div className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                  <div className="py-1">
                                    <button
                                      onClick={() => startMasterLinkedAction('complimentary', order.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-pink-600 hover:bg-pink-50 flex items-center gap-2"
                                    >
                                      <Gift className="h-4 w-4" />
                                      Mark All Complimentary
                                    </button>
                                    <button
                                      onClick={() => startMasterLinkedAction('writeOff', order.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FileX className="h-4 w-4" />
                                      Write Off All
                                    </button>
                                    <button
                                      onClick={() => startMasterLinkedAction('void', order.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Void All Orders
                                    </button>
                                    <button
                                      onClick={() => startMasterLinkedAction('voidAndReorder', order.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      Void All & Re-order
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            Created {getTimeAgo(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
                }
              
                // Regular single order card
                return (
                  <React.Fragment key={order.id}>
                    {showSeparator && (
                      <div className="col-span-full flex items-center gap-3 py-2">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${separatorConfig.bgColor}`}>
                          <SeparatorIcon className={`h-4 w-4 ${separatorConfig.textColor}`} />
                          <span className={`font-semibold text-sm ${separatorConfig.textColor}`}>{separatorConfig.label}</span>
                          <Badge className={`${separatorConfig.bgColor} ${separatorConfig.textColor} border-0`}>{ordersInStatus}</Badge>
                        </div>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}
                  <div 
                    key={order.id} 
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${statusBorderColor} p-4 hover:shadow-md transition-all ${
                      isSelectedForLink ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                    }`}
                    onClick={linkMode && canLink ? () => toggleOrderForLink(order.id) : undefined}
                    style={{ cursor: linkMode && canLink ? 'pointer' : 'default' }}
                  >
                    <div className={`flex flex-col ${gridColumns === 1 ? 'lg:flex-row lg:items-center' : ''} justify-between gap-4`}>
                      {/* Link Checkbox */}
                      {linkMode && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelectedForLink}
                            onChange={() => canLink && toggleOrderForLink(order.id)}
                            disabled={!canLink}
                            className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                      )}
                      
                      {/* Order Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{formatOrderNumber(order.orderNumber)}</h3>
                          <Badge className={`${statusInfo.color} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          {order.tableNumber && (
                            <Badge variant="outline" className="text-xs">
                              Table {order.tableNumber}
                            </Badge>
                          )}
                          {order.orderType && (
                            <Badge variant="outline" className="text-xs">
                              {order.orderType === 'DINE_IN' ? '🍽️ Dine-In' : 
                               order.orderType === 'TAKEOUT' ? '🛍️ Takeout' : 
                               '🚚 Delivery'}
                            </Badge>
                          )}
                          {!canLink && linkMode && (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              Cannot link
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Customer:</span> {order.customerName}
                          </p>
                          {/* Items with status icons */}
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Items:</span>
                            <div className="mt-1 space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className={`${item.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    {item.status === 'VOIDED' ? (
                                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                    ) : item.status === 'COMPLETED' ? (
                                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                    ) : (
                                      <ChefHat className="h-3 w-3 text-blue-500 shrink-0" />
                                    )}
                                    <span className={`flex-1 ${item.status === 'VOIDED' ? 'line-through' : ''}`}>
                                      {item.name}
                                      {item.variantName && <span className="text-amber-600 ml-1">({item.variantName})</span>}
                                      {' '}(x{item.quantity})
                                    </span>
                                    {item.status !== 'VOIDED' && order.status !== 'COMPLETED' && order.paymentStatus === 'UNPAID' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          startAuthorizedAction('voidItem', order.id, order, item.id, item.name)
                                        }}
                                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Void this item"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  {/* Addons */}
                                  {item.addons && item.addons.length > 0 && (
                                    <div className="ml-5 text-xs text-gray-500">
                                      {item.addons.map((addon, addonIdx) => (
                                        <div key={addonIdx}>+ {addon.addonName} x{addon.quantity}</div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Notes */}
                                  {item.notes && (
                                    <div className="ml-5 text-xs text-gray-400 italic">Note: {item.notes}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>{getTimeAgo(order.createdAt)}</span>
                            <span>•</span>
                            <span className="font-semibold text-lg" style={{ color: '#F9C900' }}>
                              ₱{order.totalAmount.toFixed(2)}
                            </span>
                            <Badge className={`text-xs ${paymentStatusConfig[order.paymentStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                            </Badge>
                            {/* Tab Order Badge for UNPAID orders without linked orders */}
                            {order.paymentStatus === 'UNPAID' && !order.linkedOrderId && (
                              <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Tab Order
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions - Based on status and payment status */}
                      <div className="flex flex-wrap lg:flex-col gap-2 relative">
                        {/* PENDING Orders (Mobile/Customer orders) */}
                        {order.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              variant="outline"
                              className="flex-1 lg:flex-none lg:min-w-[120px] border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              ✏️ Edit Order
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                              className="flex-1 lg:flex-none lg:min-w-[120px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              👨‍🍳 Start Preparing
                            </Button>
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                  }}
                                  className="px-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                {openMoreActionsId === order.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                    <button
                                      onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Cancel Order
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* PREPARING Orders - Unpaid */}
                        {order.status === 'PREPARING' && order.paymentStatus === 'UNPAID' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                              className="lg:min-w-[120px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              ✅ Mark Complete
                            </Button>
                            
                            {/* Add Another Order button for Tab Orders */}
                            <Button
                              size="sm"
                              onClick={() => handleAddToTab(order)}
                              variant="outline"
                              className="flex items-center gap-1 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <Plus className="h-4 w-4" />
                              Add Another Order
                            </Button>
                            
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                  }}
                                  className="px-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                {openMoreActionsId === order.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                    <button
                                      onClick={() => startAuthorizedAction('void', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 first:rounded-t-lg"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Void Order
                                    </button>
                                    <button
                                      onClick={() => handleAddLinkedOrder(order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                      <Link2 className="h-4 w-4" />
                                      Add Linked Order
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('voidAndReorder', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      Void & Re-order
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* PREPARING Orders - Already Paid */}
                        {order.status === 'PREPARING' && order.paymentStatus === 'PAID' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                              className="lg:min-w-[120px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              ✅ Mark Complete
                            </Button>
                            
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                  }}
                                  className="px-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                {openMoreActionsId === order.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                    <button
                                      onClick={() => startAuthorizedAction('refund', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 rounded-lg"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                      Void & Refund
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* READY Orders */}
                        {order.status === 'READY' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                              className="lg:min-w-[120px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              ✅ Order Served
                            </Button>
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                }}
                                className="px-2"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}

                        {/* COMPLETED Orders - Unpaid */}
                        {order.status === 'COMPLETED' && order.paymentStatus === 'UNPAID' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaidAndPrint(order)}
                              className="flex items-center gap-1 lg:min-w-[140px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              <Printer className="h-4 w-4" />
                              Mark Paid & Print
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaidButton(order)}
                              className="flex items-center gap-1 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <DollarSign className="h-4 w-4" />
                              Mark as Paid
                            </Button>
                            
                            {/* Add Another Order button for Tab Orders */}
                            <Button
                              size="sm"
                              onClick={() => handleAddToTab(order)}
                              variant="outline"
                              className="flex items-center gap-1 border-amber-300 text-amber-600 hover:bg-amber-50"
                            >
                              <Plus className="h-4 w-4" />
                              Add Another Order
                            </Button>
                            
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                  }}
                                  className="px-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                {openMoreActionsId === order.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                    <button
                                      onClick={() => startAuthorizedAction('complimentary', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-pink-600 hover:bg-pink-50 flex items-center gap-2 first:rounded-t-lg"
                                    >
                                      <Gift className="h-4 w-4" />
                                      Mark as Complimentary
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('writeOff', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FileX className="h-4 w-4" />
                                      Report Non-Payment
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('void', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Void Order
                                    </button>
                                    <button
                                      onClick={() => printReceipt(order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <Printer className="h-4 w-4" />
                                      Print Total Bill
                                    </button>
                                    <button
                                      onClick={() => handleAddLinkedOrder(order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                      <Link2 className="h-4 w-4" />
                                      Add Linked Order
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('voidAndReorder', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      Void & Re-order
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* COMPLETED Orders - Already Paid */}
                        {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => printReceipt(order)}
                              className="flex items-center gap-1 lg:min-w-[140px]"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              <Printer className="h-4 w-4" />
                              Print Receipt
                            </Button>
                            {/* View Details + More side by side */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMoreActionsId(openMoreActionsId === order.id ? null : order.id)
                                  }}
                                  className="px-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                
                                {openMoreActionsId === order.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                                    <button
                                      onClick={() => startAuthorizedAction('refund', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 first:rounded-t-lg"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                      Refund Order
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('void', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Void Order
                                    </button>
                                    <button
                                      onClick={() => startAuthorizedAction('voidAndReorder', order.id, order)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 last:rounded-b-lg"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      Void & Re-order
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* CANCELLED Orders - just show view button */}
                        {order.status === 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
              })
            })()
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${(statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.PREPARING).color} border`}>
                    {(statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.PREPARING).label}
                  </Badge>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Number</p>
                    <p className="font-semibold">{formatOrderNumber(selectedOrder.orderNumber)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Customer</p>
                    <p className="font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  {selectedOrder.tableNumber && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Table Number</p>
                      <p className="font-semibold">{selectedOrder.tableNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Type</p>
                    <Badge variant="outline">
                      {selectedOrder.orderType === 'DINE_IN' ? '🍽️ Dine-In' : 
                       selectedOrder.orderType === 'TAKEOUT' ? '🛍️ Takeout' : 
                       selectedOrder.orderType === 'DELIVERY' ? '🚚 Delivery' : 'Not set'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                    <Badge variant={selectedOrder.paymentStatus === 'PAID' ? 'default' : 'outline'}>
                      {selectedOrder.paymentStatus === 'PAID' ? '✓ Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                    <div className="flex items-center gap-2">
                      {/* Show dropdown for unpaid orders */}
                      {(selectedOrder.status !== 'CANCELLED' && selectedOrder.paymentStatus === 'UNPAID') ? (
                        <select
                          value={selectedOrder.paymentMethod || 'Cash'}
                          onChange={async (e) => {
                            const newMethod = e.target.value
                            try {
                              await ordersApi.update(selectedOrder.id, { paymentMethod: newMethod })
                              setOrders(prev => prev.map(order => 
                                order.id === selectedOrder.id ? { ...order, paymentMethod: newMethod } : order
                              ))
                              setSelectedOrder({ ...selectedOrder, paymentMethod: newMethod })
                            } catch (error: any) {
                              console.error('Failed to update payment method:', error)
                              toast.error('Update Failed', `Failed to update payment method: ${error.response?.data?.error || error.message}`)
                            }
                          }}
                          className="h-9 px-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="GCash">GCash</option>
                          <option value="PayMaya">PayMaya</option>
                        </select>
                      ) : (
                        <p className="font-semibold">{selectedOrder.paymentMethod || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Created</p>
                    <p className="font-semibold">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                    <p className="font-semibold">₱{(selectedOrder.totalAmount / 1.12).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">VAT (12%)</p>
                    <p className="font-semibold">₱{(selectedOrder.totalAmount - selectedOrder.totalAmount / 1.12).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className={`p-3 bg-gray-50 rounded-lg ${item.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            {/* Item status icon */}
                            {item.status === 'VOIDED' ? (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                            ) : item.status === 'COMPLETED' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-1" />
                            ) : (
                              <ChefHat className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                            )}
                            <div>
                              <p className={`font-medium ${item.status === 'VOIDED' ? 'line-through' : ''}`}>
                                {item.name}
                                {item.variantName && <span className="text-amber-600 ml-1">({item.variantName})</span>}
                              </p>
                              <p className="text-sm text-gray-500">Quantity: {item.quantity} × ₱{item.price.toFixed(2)}</p>
                              {/* Addons */}
                              {item.addons && item.addons.length > 0 && (
                                <div className="mt-1 text-sm text-gray-500">
                                  {item.addons.map((addon, addonIdx) => (
                                    <div key={addonIdx}>+ {addon.addonName} ×{addon.quantity} (₱{addon.subtotal.toFixed(2)})</div>
                                  ))}
                                </div>
                              )}
                              {/* Notes */}
                              {item.notes && (
                                <div className="mt-1 text-xs text-gray-400 italic">Note: {item.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-semibold ${item.status === 'VOIDED' ? 'line-through text-gray-400' : ''}`}>₱{item.subtotal.toFixed(2)}</p>
                              {item.status && (
                                <span className={`text-xs ${
                                item.status === 'COMPLETED' ? 'text-green-600' : 
                                item.status === 'VOIDED' ? 'text-red-600' : 
                                'text-blue-600'
                              }`}>
                                {item.status === 'COMPLETED' ? '✓ Done' : 
                                 item.status === 'VOIDED' ? '✗ Voided' : 
                                 '🍳 Preparing'}
                              </span>
                            )}
                            </div>
                            {/* Void button for items that are not voided and order is not completed/paid */}
                            {item.status !== 'VOIDED' && selectedOrder.status !== 'COMPLETED' && selectedOrder.paymentStatus === 'UNPAID' && (
                              <button
                                onClick={() => {
                                  startAuthorizedAction('voidItem', selectedOrder.id, selectedOrder, item.id, item.name)
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Void this item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Subtotal breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Items Total</span>
                      <span>₱{selectedOrder.totalAmount.toFixed(2)}</span>
                    </div>
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span>₱{selectedOrder.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.serviceFee > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Service Fee</span>
                        <span>₱{selectedOrder.serviceFee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Discount</span>
                        <span>-₱{selectedOrder.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-3">
                    <span>Total Amount</span>
                    <span style={{ color: '#F9C900' }}>₱{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Cash and Change info for PAID orders */}
                  {selectedOrder.paymentStatus === 'PAID' && selectedOrder.cashReceived && selectedOrder.cashReceived > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-700">Cash Received</span>
                        <span className="font-semibold text-green-700">₱{selectedOrder.cashReceived.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-700">Change</span>
                        <span className="font-semibold text-green-700">₱{(selectedOrder.changeAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Status and Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Print Receipt Button for PREPARING and COMPLETED orders */}
                    {(selectedOrder.status === 'PREPARING' || selectedOrder.status === 'COMPLETED') && (
                      <Button
                        onClick={async () => {
                          await printReceipt(selectedOrder)
                          setSelectedOrder(null)
                        }}
                        className="w-full flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#F9C900', color: '#000000' }}
                      >
                        <Printer className="h-4 w-4" />
                        Print Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Payment Method Change Modal */}
      {showPaymentMethodModal && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Change Payment Method</h2>
              <button
                onClick={() => setShowPaymentMethodModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Order: <span className="font-semibold">{formatOrderNumber(selectedOrder.orderNumber)}</span>
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Payment Method</label>
                <div className="space-y-2">
                  {['Cash', 'Card', 'GCash', 'PayMaya'].map(method => (
                    <button
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                        selectedPaymentMethod === method
                          ? 'border-[#F9C900] bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{method}</span>
                        {selectedPaymentMethod === method && (
                          <span className="text-[#F9C900]">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => setShowPaymentMethodModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updatePaymentMethod}
                  className="flex-1"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Orders Modal */}
      {showMergeModal && mergedOrderData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Merge className="h-5 w-5 text-amber-500" />
                    Merged Orders Receipt
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {mergedOrderData.orderNumbers.length} orders combined
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMergeModal(false)
                    setMergedOrderData(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Order Numbers */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Orders Being Merged</p>
                <div className="flex flex-wrap gap-2">
                  {mergedOrderData.orderNumbers.map(num => (
                    <Badge key={num} variant="outline">{formatOrderNumber(num)}</Badge>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              {(mergedOrderData.customerName || mergedOrderData.tableNumber) && (
                <div className="grid grid-cols-2 gap-4">
                  {mergedOrderData.customerName && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Customer</p>
                      <p className="font-semibold">{mergedOrderData.customerName}</p>
                    </div>
                  )}
                  {mergedOrderData.tableNumber && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Table</p>
                      <p className="font-semibold">{mergedOrderData.tableNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-sm font-semibold mb-2">Combined Items</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {mergedOrderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-medium">₱{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-amber-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₱{mergedOrderData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (12%)</span>
                  <span>₱{mergedOrderData.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-amber-200">
                  <span>Total Amount</span>
                  <span className="text-amber-600">₱{mergedOrderData.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['CASH', 'GCASH', 'CARD', 'PAYMAYA'].map(method => (
                    <button
                      key={method}
                      onClick={() => setMergePaymentMethod(method)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        mergePaymentMethod === method
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                onClick={() => {
                  setShowMergeModal(false)
                  setMergedOrderData(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMergedPayment}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                Pay & Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reason Input Modal */}
      {showReasonModal && pendingAction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={cancelPendingAction} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {pendingAction.type === 'void' && 'Void Order'}
                      {pendingAction.type === 'refund' && 'Refund Order'}
                      {pendingAction.type === 'complimentary' && 'Mark as Complimentary'}
                      {pendingAction.type === 'writeOff' && 'Report Non-Payment'}
                      {pendingAction.type === 'voidAndReorder' && 'Void & Re-order'}
                      {pendingAction.type === 'voidItem' && `Void Item: ${pendingAction.itemName}`}
                    </h2>
                    <p className="text-sm text-gray-600">Please provide a reason for this action</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Preset Reasons Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Select Reason
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setActionReason(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-700"
                  >
                    <option value="">-- Select a preset reason --</option>
                    {pendingAction.type === 'void' && (
                      <>
                        <option value="Customer cancelled order">Customer cancelled order</option>
                        <option value="Wrong order placed">Wrong order placed</option>
                        <option value="Duplicate order">Duplicate order</option>
                        <option value="System error / test order">System error / test order</option>
                        <option value="Item unavailable">Item unavailable</option>
                      </>
                    )}
                    {pendingAction.type === 'voidItem' && (
                      <>
                        <option value="Customer changed mind">Customer changed mind</option>
                        <option value="Out of stock">Out of stock</option>
                        <option value="Wrong item ordered">Wrong item ordered</option>
                        <option value="Quality issue">Quality issue</option>
                        <option value="Kitchen error">Kitchen error</option>
                      </>
                    )}
                    {pendingAction.type === 'refund' && (
                      <>
                        <option value="Customer request">Customer request</option>
                        <option value="Order not prepared correctly">Order not prepared correctly</option>
                        <option value="Long wait time">Long wait time</option>
                        <option value="Food quality issue">Food quality issue</option>
                        <option value="Service issue">Service issue</option>
                      </>
                    )}
                    {pendingAction.type === 'complimentary' && (
                      <>
                        <option value="VIP customer">VIP customer</option>
                        <option value="Apology for service delay">Apology for service delay</option>
                        <option value="Staff meal">Staff meal</option>
                        <option value="Promotion / marketing">Promotion / marketing</option>
                        <option value="Customer complaint resolution">Customer complaint resolution</option>
                      </>
                    )}
                    {pendingAction.type === 'writeOff' && (
                      <>
                        <option value="Customer left without paying">Customer left without paying</option>
                        <option value="Payment declined">Payment declined</option>
                        <option value="Customer dispute">Customer dispute</option>
                        <option value="Food spoilage">Food spoilage</option>
                      </>
                    )}
                    {pendingAction.type === 'voidAndReorder' && (
                      <>
                        <option value="Incorrect item entered">Incorrect item entered</option>
                        <option value="Customer changed order">Customer changed order</option>
                        <option value="Need to modify items">Need to modify items</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter reason for this action..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={cancelPendingAction} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReasonSubmit}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={!actionReason.trim()}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manager PIN Authorization Modal */}
      <ManagerPinModal
        isOpen={showManagerPinModal}
        onClose={cancelPendingAction}
        onAuthorized={executePendingAction}
        title={
          pendingAction?.type === 'void' ? 'Authorize Void Order' :
          pendingAction?.type === 'refund' ? 'Authorize Refund' :
          pendingAction?.type === 'complimentary' ? 'Authorize Complimentary' :
          pendingAction?.type === 'writeOff' ? 'Authorize Write-Off' :
          pendingAction?.type === 'voidAndReorder' ? 'Authorize Void & Re-order' :
          pendingAction?.type === 'voidItem' ? `Authorize Void Item: ${pendingAction.itemName}` :
          'Manager Authorization Required'
        }
        description={`Reason: ${actionReason}`}
        variant={pendingAction?.type === 'void' || pendingAction?.type === 'voidAndReorder' || pendingAction?.type === 'voidItem' ? 'danger' : 'warning'}
        actionLabel="Authorize"
      />

      {/* Cash Calculator Modal */}
      <CashCalculatorModal
        isOpen={showCashModal}
        onClose={() => {
          setShowCashModal(false)
          setCashModalOrder(null)
          setCashModalMarkPaid(false)
        }}
        onConfirm={handleCashConfirm}
        totalAmount={cashModalOrder?.totalAmount || 0}
        title={cashModalMarkPaid ? 'Payment - Print Receipt' : 'Payment'}
      />

      {/* Click outside handler for More Actions dropdown */}
      {openMoreActionsId && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpenMoreActionsId(null)}
        />
      )}
    </AdminLayout>
  )
}
