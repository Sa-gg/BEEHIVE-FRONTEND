import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { ordersApi, type OrderResponse } from '../../../../infrastructure/api/orders.api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../common/ui/dialog'
import { Badge } from '../../common/ui/badge'
import { Loader2, Package, Clock } from 'lucide-react'

interface MyOrdersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MyOrdersModal = ({ open, onOpenChange }: MyOrdersModalProps) => {
  const { user, isAuthenticated } = useAuthStore()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && isAuthenticated) {
      fetchOrders()
    }
  }, [open, isAuthenticated])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      // Fetch all orders (backend should filter by customer if implemented)
      const allOrders = await ordersApi.getAll()
      // For now, filter on frontend if customerName matches
      const customerOrders = allOrders.filter(
        order => order.customerName === user?.name || order.customerName === user?.email
      )
      // Sort by most recent first
      customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setOrders(customerOrders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'Pending', variant: 'outline' },
      PREPARING: { label: 'Preparing', variant: 'default' },
      READY: { label: 'Ready', variant: 'secondary' },
      COMPLETED: { label: 'Completed', variant: 'secondary' },
      CANCELLED: { label: 'Cancelled', variant: 'destructive' },
    }
    const config = statusConfig[status] || statusConfig.PENDING
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getOrderTypeEmoji = (orderType: string) => {
    const emojis: Record<string, string> = {
      DINE_IN: '🍽️',
      TAKEOUT: '🥡',
      DELIVERY: '🛵',
    }
    return emojis[orderType] || '📦'
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>My Orders</DialogTitle>
            <DialogDescription>
              Please sign in to view your orders.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Orders</DialogTitle>
          <DialogDescription>
            View your order history and track current orders
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#F9C900' }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Package className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm">No orders found</p>
            <p className="text-xs mt-1">Start ordering to see your history here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <span>{getOrderTypeEmoji(order.orderType)} {order.orderType.replace('_', ' ')}</span>
                      {order.tableNumber && <span>• Table {order.tableNumber}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: '#F9C900' }}>
                      ₱{order.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity}x Item #{item.menuItemId.slice(0, 8)}
                        </span>
                        <span className="text-gray-900">₱{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge variant={order.paymentStatus === 'PAID' ? 'secondary' : 'outline'}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
