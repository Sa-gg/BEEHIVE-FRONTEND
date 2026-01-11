import { useState, useEffect, useCallback } from 'react'
import type { CustomerOrder } from '../../../../core/domain/entities/CustomerOrder.entity'
import { Button } from '../../common/ui/button'
import { CheckCircle2, Clock, ChefHat, Bell, PartyPopper, Home } from 'lucide-react'
import { useOrderEvents } from '../../../../shared/hooks/useOrderEvents'
import { ordersApi } from '../../../../infrastructure/api/orders.api'
import { MyOrdersModal } from './MyOrdersModal'
import { useAuthStore } from '../../../store/authStore'

interface OrderConfirmationProps {
  order: CustomerOrder
  onNewOrder: () => void
}

// Format order number to show only the sequence number
const formatOrderNumber = (orderNumber: string) => {
  const match = orderNumber.match(/ORD-\d{8}-(\d+)/)
  return match ? match[1] : orderNumber
}

// Status progress steps
const statusSteps = [
  { status: 'PENDING', label: 'Order Received', icon: CheckCircle2 },
  { status: 'PREPARING', label: 'Being Prepared', icon: ChefHat },
  { status: 'READY', label: 'Ready for Pickup', icon: Bell },
  { status: 'COMPLETED', label: 'Completed', icon: PartyPopper },
]

const getStatusIndex = (status: string) => {
  const index = statusSteps.findIndex(s => s.status === status)
  return index >= 0 ? index : 0
}

export const OrderConfirmation = ({ order: initialOrder, onNewOrder }: OrderConfirmationProps) => {
  const [order, setOrder] = useState<CustomerOrder>(initialOrder)
  const [showConfetti, setShowConfetti] = useState(false)
  const [orderNotifications, setOrderNotifications] = useState(0)
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)
  
  const { user } = useAuthStore()
  
  const currentStatusIndex = getStatusIndex(order.status)
  const isReady = order.status === 'ready'
  const isCompleted = order.status === 'completed'

  // Refresh order notifications count - same logic as MyOrdersModal
  const refreshOrderNotifications = useCallback(async () => {
    try {
      let customerOrders: any[]
      
      if (user) {
        // For authenticated users, filter by name (same as MyOrdersModal)
        const allOrders = await ordersApi.getAll()
        customerOrders = allOrders.filter(
          (order: any) => order.customerName === user?.name || order.customerName === user?.email
        )
      } else {
        // For guests, fetch orders by device ID
        customerOrders = await ordersApi.getMyOrders()
      }
      
      // Only count truly active orders (not completed, not cancelled)
      const activeOrders = customerOrders.filter((o: any) => {
        const status = (o.status || '').toUpperCase()
        return !['COMPLETED', 'CANCELLED'].includes(status)
      })
      setOrderNotifications(activeOrders.length)
      setHasOrderUpdates(activeOrders.some((o: any) => 
        ['ready', 'READY'].includes(o.status)
      ))
    } catch {
      // Ignore errors
    }
  }, [user])

  // Poll for order notifications
  useEffect(() => {
    refreshOrderNotifications()
    const interval = setInterval(refreshOrderNotifications, 10000)
    return () => clearInterval(interval)
  }, [refreshOrderNotifications])

  // Real-time order update handler
  const onOrderUpdate = useCallback((updatedOrder: any) => {
    if (updatedOrder.id === order.id) {
      const wasNotReady = order.status !== 'ready'
      const isNowReady = updatedOrder.status === 'ready' || updatedOrder.status === 'READY'
      
      // Show confetti when order becomes ready
      if (wasNotReady && isNowReady) {
        setShowConfetti(true)
        // Vibrate on mobile devices
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300])
        }
        setTimeout(() => setShowConfetti(false), 3000)
      }
      
      setOrder(prev => ({
        ...prev,
        status: updatedOrder.status,
      }))
    }
  }, [order.id, order.status])

  // Subscribe to real-time updates
  useOrderEvents({
    type: 'customer',
    deviceId: order.deviceId,
    onOrderUpdate,
    enabled: !isCompleted,
  })

  // Initial confetti for successful order placement
  useEffect(() => {
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#F9C900', '#FCD34D', '#FBBF24', '#F59E0B', '#92400E'][Math.floor(Math.random() * 5)],
                width: `${8 + Math.random() * 8}px`,
                height: `${8 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}

      {/* Floating Bee Icon - Top Right with Notifications (matches MenuPage styling) */}
      <button
        onClick={() => setShowMyOrders(true)}
        className={`fixed top-4 right-4 z-40 group transition-all duration-300 ${
          hasOrderUpdates || orderNotifications > 0 ? 'animate-bounce-slow' : ''
        }`}
      >
        <div className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          orderNotifications > 0 
            ? 'bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-yellow-300' 
            : 'bg-white border-2 border-gray-200 hover:border-yellow-400'
        } hover:shadow-2xl hover:scale-110`}>
          {/* Bee Emoji */}
          <span className={`text-2xl transition-transform duration-300 ${orderNotifications > 0 ? 'animate-wiggle' : 'group-hover:scale-110'}`}>
            🐝
          </span>
        </div>
        
        {/* Notification Badge */}
        {orderNotifications > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500 shadow-lg">
            {orderNotifications}
          </span>
        )}
        
        {/* Ready Order Pulse Effect */}
        {hasOrderUpdates && (
          <span className="absolute -top-2 -left-2 w-5 h-5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center shadow-sm">
              <Bell className="h-2.5 w-2.5 text-white" />
            </span>
          </span>
        )}
      </button>

      {/* Success Header */}
      <div className="bg-white px-6 py-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
            isReady ? 'bg-green-500 animate-pulse' : isCompleted ? 'bg-gray-400' : 'bg-amber-400'
          }`}>
            {isReady ? (
              <Bell className="h-12 w-12 text-white animate-wiggle" />
            ) : isCompleted ? (
              <PartyPopper className="h-12 w-12 text-white" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-white" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isReady ? '🎉 Your Order is Ready!' : isCompleted ? 'Order Completed!' : 'Order Placed!'}
        </h1>
        <p className="text-gray-600">
          {isReady ? 'Please proceed to the counter' : isCompleted ? 'Thank you for your order!' : 'Your order has been received'}
        </p>
      </div>

      {/* Order Details */}
      <div className="flex-1 px-4 py-6 space-y-4">
        {/* Order Number Card - Large and Prominent */}
        <div className={`bg-white rounded-2xl p-6 shadow-md text-center border-3 transition-all duration-300 ${
          isReady ? 'border-green-400 bg-green-50' : 'border-amber-400'
        }`}>
          <p className="text-sm text-gray-500 mb-1 uppercase tracking-wide font-medium">Order Number</p>
          <p className={`text-6xl font-black mb-3 transition-colors ${
            isReady ? 'text-green-600' : 'text-amber-500'
          }`}>
            #{formatOrderNumber(order.orderNumber)}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Status Progress Tracker */}
        <div className="bg-white rounded-2xl p-5 shadow-md">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-amber-500" />
            Order Status
          </h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
            
            {/* Status Steps */}
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon
                const isActive = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex
                
                return (
                  <div key={step.status} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCurrent 
                        ? 'bg-amber-400 ring-4 ring-amber-200 scale-110' 
                        : isActive 
                          ? 'bg-amber-400' 
                          : 'bg-gray-200'
                    }`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className={`mt-2 text-xs text-center max-w-[70px] font-medium ${
                      isCurrent ? 'text-amber-600' : isActive ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Status Message */}
          <div className={`mt-5 p-3 rounded-xl text-center text-sm font-medium ${
            isReady 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isReady 
              ? '🔔 Your order is ready! Please pick it up at the counter.' 
              : isCompleted 
                ? '✅ Thank you! See you again soon!' 
                : '⏳ We\'re working on your order...'}
          </div>
        </div>

        {/* Customer Info */}
        {(order.customerName || order.tableNumber) && (
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h2 className="font-bold text-gray-800 mb-3">Your Details</h2>
            <div className="space-y-2 text-sm">
              {order.customerName && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-800">{order.customerName}</span>
                </div>
              )}
              {order.tableNumber && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Table</span>
                  <span className="font-medium text-gray-800">{order.tableNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items - Collapsible style */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h2 className="font-bold text-gray-800 mb-3">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.quantity}
                  </span>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-medium text-gray-800">₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>₱{(order.total / 1.12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT (12%)</span>
              <span>₱{(order.total - order.total / 1.12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 text-gray-800">
              <span>Total</span>
              <span className="text-amber-500">₱{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Simple instruction card instead of QR */}
        <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-200">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">📱</span>
            </div>
          </div>
          <p className="text-amber-800 font-medium">
            Show this screen to the cashier when picking up your order
          </p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-4 bg-white border-t shadow-lg">
        <Button
          onClick={onNewOrder}
          className="w-full h-14 text-lg font-semibold rounded-xl transition-all"
          style={{ backgroundColor: '#F9C900', color: '#000000' }}
        >
          <Home className="h-5 w-5 mr-2" />
          Order More
        </Button>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .border-3 {
          border-width: 3px;
        }
      `}</style>

      {/* My Orders Modal */}
      <MyOrdersModal
        open={showMyOrders}
        onOpenChange={setShowMyOrders}
        onFeedbackSubmitted={refreshOrderNotifications}
      />
    </div>
  )
}
