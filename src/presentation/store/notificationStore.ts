import { create } from 'zustand'
import { ordersApi, type OrderResponse } from '../../infrastructure/api/orders.api'
import { inventoryApi } from '../../infrastructure/api/inventory.api'

interface NotificationState {
  pendingOrders: OrderResponse[]
  lowStockItems: Array<{ id: string; name: string; currentStock: number; minStock: number }>
  outOfStockItems: Array<{ id: string; name: string }>
  lastUpdated: Date | null
  isLoading: boolean
  
  // Computed counts
  pendingOrderCount: number
  stockAlertCount: number
  
  // Actions
  fetchNotifications: () => Promise<void>
  markOrderAsSeen: (orderId: string) => void
  clearStockAlert: (itemId: string) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  pendingOrders: [],
  lowStockItems: [],
  outOfStockItems: [],
  lastUpdated: null,
  isLoading: false,
  pendingOrderCount: 0,
  stockAlertCount: 0,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      // Fetch all orders and filter for pending
      const orders = await ordersApi.getAll()
      const pendingOrders = orders.filter(order => 
        order.status === 'PENDING' && order.orderType !== 'DINE_IN'
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
  }
}))
