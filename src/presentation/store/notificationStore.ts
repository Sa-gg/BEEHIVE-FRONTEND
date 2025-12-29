import { create } from 'zustand'
import { ordersApi, type OrderResponse } from '../../infrastructure/api/orders.api'
import { inventoryApi } from '../../infrastructure/api/inventory.api'

interface NewOrderAlert {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  timestamp: Date
}

interface NotificationState {
  pendingOrders: OrderResponse[]
  lowStockItems: Array<{ id: string; name: string; currentStock: number; minStock: number }>
  outOfStockItems: Array<{ id: string; name: string }>
  lastUpdated: Date | null
  isLoading: boolean
  
  // New order alert (for real-time notifications across all admin pages)
  newOrderAlert: NewOrderAlert | null
  
  // Computed counts
  pendingOrderCount: number
  stockAlertCount: number
  
  // Actions
  fetchNotifications: () => Promise<void>
  markOrderAsSeen: (orderId: string) => void
  clearStockAlert: (itemId: string) => void
  
  // Real-time actions
  addNewOrderAlert: (order: OrderResponse) => void
  dismissNewOrderAlert: () => void
  handleNewOrder: (order: OrderResponse) => void
  handleOrderUpdate: (order: OrderResponse) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  pendingOrders: [],
  lowStockItems: [],
  outOfStockItems: [],
  lastUpdated: null,
  isLoading: false,
  newOrderAlert: null,
  pendingOrderCount: 0,
  stockAlertCount: 0,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      // Fetch all orders and filter for pending (all types)
      const orders = await ordersApi.getAll()
      const pendingOrders = orders.filter(order => 
        order.status === 'PENDING'
      )

      // Fetch inventory stats for stock alerts
      const inventoryItems = await inventoryApi.getAll({})
      const lowStockItems = inventoryItems
        .filter(item => item.status === 'LOW_STOCK')
        .map(item => ({
          id: item.id,
          name: item.name,
          currentStock: item.currentStock,
          minStock: item.minStock
        }))
      
      const outOfStockItems = inventoryItems
        .filter(item => item.status === 'OUT_OF_STOCK')
        .map(item => ({
          id: item.id,
          name: item.name
        }))

      set({
        pendingOrders,
        lowStockItems,
        outOfStockItems,
        pendingOrderCount: pendingOrders.length,
        stockAlertCount: lowStockItems.length + outOfStockItems.length,
        lastUpdated: new Date(),
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      set({ isLoading: false })
    }
  },

  markOrderAsSeen: (orderId: string) => {
    const { pendingOrders } = get()
    const filtered = pendingOrders.filter(order => order.id !== orderId)
    set({ 
      pendingOrders: filtered,
      pendingOrderCount: filtered.length
    })
  },

  clearStockAlert: (itemId: string) => {
    const { lowStockItems, outOfStockItems } = get()
    const newLowStock = lowStockItems.filter(item => item.id !== itemId)
    const newOutOfStock = outOfStockItems.filter(item => item.id !== itemId)
    set({
      lowStockItems: newLowStock,
      outOfStockItems: newOutOfStock,
      stockAlertCount: newLowStock.length + newOutOfStock.length
    })
  },

  // Real-time: Add new order alert
  addNewOrderAlert: (order: OrderResponse) => {
    // Format order number - remove date prefix for cleaner display
    const match = order.orderNumber.match(/ORD-\d{8}-(\d+)/)
    const formattedNumber = match ? `ORD-${match[1]}` : order.orderNumber
    
    set({
      newOrderAlert: {
        id: order.id,
        orderNumber: formattedNumber,
        customerName: order.customerName || 'Guest',
        totalAmount: order.totalAmount,
        timestamp: new Date()
      }
    })
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      const { newOrderAlert } = get()
      if (newOrderAlert?.id === order.id) {
        set({ newOrderAlert: null })
      }
    }, 8000)
  },

  dismissNewOrderAlert: () => {
    set({ newOrderAlert: null })
  },

  // Handle new order from SSE
  handleNewOrder: (order: OrderResponse) => {
    const { pendingOrders } = get()
    
    // Add to pending orders if it's a new pending order
    if (order.status === 'PENDING') {
      const exists = pendingOrders.some(o => o.id === order.id)
      if (!exists) {
        const newPendingOrders = [order, ...pendingOrders]
        set({
          pendingOrders: newPendingOrders,
          pendingOrderCount: newPendingOrders.length
        })
      }
    }
    
    // Only show alert for customer orders
    // POS orders created by cashiers/managers should not trigger notification popup
    const createdBy = order.createdBy?.toLowerCase() || ''
    const isCustomerOrder = createdBy === 'customer' || createdBy === 'guest customer' || createdBy === 'guest'
    if (isCustomerOrder) {
      get().addNewOrderAlert(order)
    }
  },

  // Handle order update from SSE
  handleOrderUpdate: (order: OrderResponse) => {
    const { pendingOrders } = get()
    
    // Update or remove from pending orders based on new status
    if (order.status === 'PENDING') {
      // Update existing or add new
      const exists = pendingOrders.some(o => o.id === order.id)
      if (exists) {
        set({
          pendingOrders: pendingOrders.map(o => o.id === order.id ? order : o)
        })
      } else {
        const newPendingOrders = [order, ...pendingOrders]
        set({
          pendingOrders: newPendingOrders,
          pendingOrderCount: newPendingOrders.length
        })
      }
    } else {
      // Remove from pending if status changed
      const filtered = pendingOrders.filter(o => o.id !== order.id)
      if (filtered.length !== pendingOrders.length) {
        set({
          pendingOrders: filtered,
          pendingOrderCount: filtered.length
        })
      }
    }
  }
}))
