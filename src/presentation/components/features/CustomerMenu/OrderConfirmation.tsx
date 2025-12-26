import type { CustomerOrder } from '../../../../core/domain/entities/CustomerOrder.entity'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { CheckCircle2, Clock, QrCode } from 'lucide-react'
import { formatOrderStatus, getStatusColor } from '../../../../shared/utils/orderUtils'

interface OrderConfirmationProps {
  order: CustomerOrder
  onNewOrder: () => void
}

export const OrderConfirmation = ({ order, onNewOrder }: OrderConfirmationProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Success Header */}
      <div className="bg-white px-6 py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F9C900' }}>
            <CheckCircle2 className="h-10 w-10 text-black" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-gray-600">Your order has been received</p>
      </div>

      {/* Order Details */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {/* Order Number Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm text-center border-2" style={{ borderColor: '#F9C900' }}>
          <p className="text-sm text-gray-600 mb-2">Order Number</p>
          <p className="text-4xl font-bold mb-4" style={{ color: '#F9C900' }}>
            {order.orderNumber}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              {new Date(order.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Status</h2>
            <Badge
              style={{
                backgroundColor: getStatusColor(order.status),
                color: 'white',
              }}
            >
              {formatOrderStatus(order.status)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Please show this order number to the cashier to confirm your order.
          </p>
        </div>

        {/* Customer Info */}
        {(order.customerName || order.tableNumber) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold mb-3">Information</h2>
            <div className="space-y-2 text-sm">
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
              )}
              {order.tableNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-medium">{order.tableNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold mb-3">Order Items</h2>
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>₱{(order.total - order.total * 0.12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (12%)</span>
              <span>₱{(order.total * 0.12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span style={{ color: '#F9C900' }}>₱{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-white rounded-xl p-6 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            <QrCode className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">
            Show this screen to the cashier
          </p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-6 bg-white border-t">
        <Button
          onClick={onNewOrder}
          className="w-full"
          size="lg"
          variant="outline"
        >
          Place Another Order
        </Button>
      </div>
    </div>
  )
}
