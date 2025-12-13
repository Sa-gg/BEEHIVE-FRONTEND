export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id: string
  items: OrderItem[]
  total: number
  tax: number
  subtotal: number
  createdAt: Date
  status: 'pending' | 'completed' | 'cancelled'
}
