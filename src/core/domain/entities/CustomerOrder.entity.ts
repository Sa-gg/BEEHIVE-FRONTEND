import type { OrderItem } from './Order.entity'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface CustomerOrder {
  id: string
  orderNumber: string // e.g., "BH001", "BH002"
  items: OrderItem[]
  total: number
  tax: number
  subtotal: number
  status: OrderStatus
  customerName?: string
  tableNumber?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}
