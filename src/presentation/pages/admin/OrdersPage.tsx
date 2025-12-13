import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Clock, CheckCircle, XCircle, Package, Search, Filter, Eye } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: 'paid' | 'unpaid'
  orderType: 'dine-in' | 'takeout' | 'delivery'
  tableNumber?: string
  createdAt: Date
  completedAt?: Date
}

// Sample data
const SAMPLE_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    items: [
      { id: '1', name: 'Bacon Pepperoni', quantity: 2, price: 299 },
      { id: '17', name: 'Hot Coffee', quantity: 2, price: 79 },
    ],
    totalAmount: 756,
    status: 'pending',
    paymentStatus: 'paid',
    orderType: 'dine-in',
    tableNumber: '5',
    createdAt: new Date(Date.now() - 5 * 60000),
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customerName: 'Jane Smith',
    items: [
      { id: '5', name: 'Beef Burger', quantity: 1, price: 149 },
      { id: '7', name: 'Burger w/ Fries', quantity: 1, price: 179 },
      { id: '21', name: 'Caramel Macchiato', quantity: 2, price: 119 },
    ],
    totalAmount: 566,
    status: 'preparing',
    paymentStatus: 'paid',
    orderType: 'takeout',
    createdAt: new Date(Date.now() - 15 * 60000),
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customerName: 'Mike Johnson',
    items: [
      { id: '2', name: 'Beef Wagon', quantity: 1, price: 329 },
      { id: '31', name: 'Blueberry Smoothie', quantity: 2, price: 149 },
    ],
    totalAmount: 627,
    status: 'ready',
    paymentStatus: 'paid',
    orderType: 'dine-in',
    tableNumber: '12',
    createdAt: new Date(Date.now() - 25 * 60000),
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    customerName: 'Sarah Williams',
    items: [
      { id: '33', name: 'Beef Tapa', quantity: 2, price: 189 },
      { id: '27', name: 'Iced Coffee', quantity: 2, price: 89 },
    ],
    totalAmount: 556,
    status: 'completed',
    paymentStatus: 'paid',
    orderType: 'delivery',
    createdAt: new Date(Date.now() - 60 * 60000),
    completedAt: new Date(Date.now() - 45 * 60000),
  },
]

export const OrdersPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

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
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
    ready: { label: 'Ready', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  }

  const orderTypeConfig = {
    'dine-in': { label: 'Dine In', emoji: '🍽️' },
    'takeout': { label: 'Takeout', emoji: '🛍️' },
    'delivery': { label: 'Delivery', emoji: '🚗' },
  }

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : order.completedAt }
        : order
    ))
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
    if (order.status === 'pending') {
      navigate('/admin/pos', { state: { editingOrder: order } })
    }
  }



  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
    const matchesSearch = searchQuery.trim() === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((currentTime - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
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
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            filteredOrders.map(order => {
              const StatusIcon = statusConfig[order.status].icon
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                        <Badge className={`${statusConfig[order.status].color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[order.status].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {orderTypeConfig[order.orderType].emoji} {orderTypeConfig[order.orderType].label}
                        </Badge>
                        {order.tableNumber && (
                          <Badge variant="outline" className="text-xs">
                            Table {order.tableNumber}
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
                          <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'} className="text-xs">
                            {order.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap lg:flex-col gap-2">
                      {order.status === 'pending' && (
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
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="flex-1 lg:flex-none lg:min-w-[120px]"
                            style={{ backgroundColor: '#F9C900', color: '#000000' }}
                          >
                            Start Preparing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="flex-1 lg:flex-none text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="lg:min-w-[120px]"
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                        >
                          Mark Ready
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="lg:min-w-[120px]"
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                        >
                          Complete Order
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
                  <Badge className={`${statusConfig[selectedOrder.status].color} border`}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                  <Badge variant="outline">
                    {orderTypeConfig[selectedOrder.orderType].emoji} {orderTypeConfig[selectedOrder.orderType].label}
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
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Type</p>
                    <p className="font-semibold">{orderTypeConfig[selectedOrder.orderType].label}</p>
                  </div>
                  {selectedOrder.tableNumber && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Table Number</p>
                      <p className="font-semibold">{selectedOrder.tableNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                    <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'outline'}>
                      {selectedOrder.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Created</p>
                    <p className="font-semibold">{selectedOrder.createdAt.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount</span>
                    <span style={{ color: '#F9C900' }}>₱{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
