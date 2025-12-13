/**
 * Generate a unique order number
 * Format: BH + timestamp-based number (e.g., BH001, BH002)
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const orderNum = ((timestamp % 10000) + random) % 10000
  return `BH${orderNum.toString().padStart(4, '0')}`
}

/**
 * Calculate order totals
 */
export const calculateOrderTotals = (subtotal: number) => {
  const tax = subtotal * 0.12 // 12% VAT
  const total = subtotal + tax
  return { subtotal, tax, total }
}

/**
 * Format order status for display
 */
export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return statusMap[status] || status
}

/**
 * Get status color
 */
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: '#F59E0B', // amber
    confirmed: '#3B82F6', // blue
    preparing: '#8B5CF6', // purple
    ready: '#10B981', // green
    completed: '#6B7280', // gray
    cancelled: '#EF4444', // red
  }
  return colorMap[status] || '#6B7280'
}
