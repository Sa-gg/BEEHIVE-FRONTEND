import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Clock, CheckCircle, XCircle, Package, Search, Filter, Eye, Loader2, Printer } from 'lucide-react'
import { ordersApi, type OrderResponse } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { useSettingsStore } from '../../store/settingsStore'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  subtotal: number
  menuItemId: string
}

interface Order {
  id: string
  orderNumber: string
  customerName: string | null
  items: OrderItem[]
  totalAmount: number
  status: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED'
  paymentMethod?: string | null
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'
  tableNumber?: string | null
  createdAt: string
  completedAt?: string | null
  subtotal: number
  tax: number
}

export const OrdersPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const [menuItemsLoaded, setMenuItemsLoaded] = useState(false)
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const { markPaidOnPrintReceipt } = useSettingsStore()

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
              subtotal: item.subtotal
            }
          })
        }))
        
        setOrders(ordersWithNames)
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
      alert('Order updated successfully!')
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
    COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus)
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : order.completedAt }
          : order
      ))
    } catch (error: any) {
      console.error('Failed to update order status:', error)
      alert(`Failed to update order status: ${error.response?.data?.error || error.message}`)
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
      alert(`Failed to update payment status: ${error.response?.data?.error || error.message}`)
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
      alert('Payment method updated successfully')
    } catch (error: any) {
      console.error('Failed to update payment method:', error)
      alert(`Failed to update payment method: ${error.response?.data?.error || error.message}`)
    }
  }

  const updateOrderItems = (orderId: string, items: OrderItem[]) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        return { ...order, items, totalAmount }
      }
      return order
    }))
  }

  const handleEditOrder = (order: Order) => {
    if (order.status === 'PENDING') {
      navigate('/admin/pos', { state: { editingOrder: order } })
    }
  }

  const printReceipt = async (order: Order) => {
    // Automatically mark as paid when printing receipt (if setting is enabled)
    if (markPaidOnPrintReceipt && order.paymentStatus !== 'PAID') {
      await markAsPaid(order.id)
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print receipt')
      return
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10mm;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #F9C900;
          }
          .info {
            margin: 10px 0;
            font-size: 12px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .items {
            margin: 15px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            width: 30px;
            text-align: center;
          }
          .item-price {
            width: 60px;
            text-align: right;
          }
          .totals {
            margin: 10px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .total-row.grand {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 11px;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            margin-top: 5px;
          }
          .completed {
            background-color: #d1fae5;
            color: #065f46;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">BEEHIVE</div>
          <div style="font-size: 10px; margin-top: 5px;">Cafe & Restaurant</div>
          <div style="font-size: 10px;">Enjoy your food with a relaxing ambiance</div>
        </div>

        <div class="info">
          <div class="info-row">
            <span>Order #:</span>
            <span>${order.orderNumber}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
          ${order.customerName ? `<div class="info-row"><span>Customer:</span><span>${order.customerName}</span></div>` : ''}
          ${order.tableNumber ? `<div class="info-row"><span>Table:</span><span>${order.tableNumber}</span></div>` : ''}
          <div class="info-row">
            <span>Status:</span>
            <span class="status-badge completed">COMPLETED</span>
          </div>
        </div>

        <div class="items">
          ${order.items.map(item => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">x${item.quantity}</span>
              <span class="item-price">₱${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₱${order.subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Tax (12%):</span>
            <span>₱${order.tax.toFixed(2)}</span>
          </div>
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>₱${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div>Thank you for dining with us!</div>
          <div style="margin-top: 5px;">Please come again</div>
          <div style="margin-top: 10px; font-size: 9px;">
            Facebook: BEEHIVECAFEANDRESTO
          </div>
          <div style="margin-top: 5px; font-size: 9px;">
            Printed: ${new Date().toLocaleString()}
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
  }



  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status.toLowerCase() === selectedStatus.toLowerCase()
    const matchesSearch = searchQuery.trim() === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Orders Management</h1>
          <p className="text-sm lg:text-base text-gray-600">Track and manage all customer orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Pending</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Preparing</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-blue-900">{stats.preparing}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Ready</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-green-900">{stats.ready}</p>
          </div>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Completed</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.completed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number or customer name..."
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

            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
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
                className="whitespace-nowrap"
              >
                Pending
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
                variant={selectedStatus === 'ready' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('ready')}
                className="whitespace-nowrap"
              >
                Ready
              </Button>
              <Button
                variant={selectedStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('completed')}
                className="whitespace-nowrap"
              >
                Completed
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            filteredOrders.map(order => {
              const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PREPARING
              const StatusIcon = statusInfo.icon
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
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
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Customer:</span> {order.customerName}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Items:</span> {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span>{getTimeAgo(order.createdAt)}</span>
                          <span>•</span>
                          <span className="font-semibold text-lg" style={{ color: '#F9C900' }}>
                            ₱{order.totalAmount.toFixed(2)}
                          </span>
                          <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'outline'} className="text-xs">
                            {order.paymentStatus === 'PAID' ? '✓ Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap lg:flex-col gap-2">
                      {order.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                            variant="outline"
                            className="flex-1 lg:flex-none lg:min-w-[120px] border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            Edit Order
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            className="flex-1 lg:flex-none lg:min-w-[120px]"
                            style={{ backgroundColor: '#F9C900', color: '#000000' }}
                          >
                            Start Preparing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                            className="flex-1 lg:flex-none text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {order.status === 'PREPARING' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                          className="lg:min-w-[120px]"
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {order.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          onClick={() => printReceipt(order)}
                          className="flex items-center gap-1 lg:min-w-[120px]"
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                        >
                          <Printer className="h-4 w-4" />
                          Print Receipt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
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
                    <p className="font-semibold">{selectedOrder.orderNumber}</p>
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
                      <p className="font-semibold">{selectedOrder.paymentMethod || 'Not set'}</p>
                      {/* Show change button only for confirmed orders and unpaid orders */}
                      {(selectedOrder.status !== 'CANCELLED' && selectedOrder.paymentStatus === 'UNPAID') && (
                        <button
                          onClick={() => {
                            setSelectedPaymentMethod(selectedOrder.paymentMethod || 'Cash')
                            setShowPaymentMethodModal(true)
                          }}
                          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Created</p>
                    <p className="font-semibold">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                    <p className="font-semibold">₱{selectedOrder.subtotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tax (12%)</p>
                    <p className="font-semibold">₱{selectedOrder.tax.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity} × ₱{item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold">₱{item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount</span>
                    <span style={{ color: '#F9C900' }}>₱{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  
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
                    
                    {/* Mark as Unpaid button (only if paid - for refund situations) */}
                    {selectedOrder.paymentStatus === 'PAID' && (
                      <Button
                        onClick={async () => {
                          const confirmed = window.confirm('Mark this order as UNPAID? (Use for refunds or payment issues)')
                          if (!confirmed) return
                          try {
                            await ordersApi.update(selectedOrder.id, { paymentStatus: 'UNPAID' })
                            setOrders(prev => prev.map(order => 
                              order.id === selectedOrder.id ? { ...order, paymentStatus: 'UNPAID' } : order
                            ))
                            setSelectedOrder({ ...selectedOrder, paymentStatus: 'UNPAID' })
                            alert('Order marked as UNPAID')
                          } catch (error: any) {
                            alert(`Failed to update payment status: ${error.message}`)
                          }
                        }}
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Mark as Unpaid
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
                Order: <span className="font-semibold">{selectedOrder.orderNumber}</span>
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
      )}    </AdminLayout>
  )
}
