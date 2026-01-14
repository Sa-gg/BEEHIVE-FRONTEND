// Selected add-on for an order item
export interface OrderItemAddon {
  addonItemId: string
  addonName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface OrderItem {
  menuItemId: string
  name: string
  price: number          // Base price (may include variant delta for display)
  quantity: number
  subtotal: number
  // NEW: Variant support
  variantId?: string | null
  variantName?: string | null
  variantPriceDelta?: number
  // NEW: Add-ons support
  addons?: OrderItemAddon[]
  // NEW: Special instructions
  notes?: string | null
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

