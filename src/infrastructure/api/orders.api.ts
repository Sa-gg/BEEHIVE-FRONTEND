import { api } from './axiosConfig';
import { getDeviceId } from '../../shared/utils/deviceId';

// Payment status enum matching backend
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'COMPLIMENTARY' | 'WRITTEN_OFF' | 'VOIDED';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type OrderItemStatus = 'PREPARING' | 'COMPLETED' | 'VOIDED';

// NEW: Order item add-on for creating orders
export interface OrderItemAddonRequest {
  addonItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  // NEW: Variant and add-ons support
  variantId?: string;
  notes?: string;
  addons?: OrderItemAddonRequest[];
}

export interface CreateOrderRequest {
  customerName?: string;
  customerPhone?: string;         // For loyalty tracking from POS
  loyaltyCardCode?: string;       // Physical loyalty card code
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  moodContext?: string;
  linkedOrderId?: string;
  createdBy?: string;
  deliveryFee?: number;
  serviceFee?: number;
  discountAmount?: number;
  cashReceived?: number;
  changeAmount?: number;
  items: OrderItem[];
  paymentMethod?: string;
  deviceId?: string; // For guest tracking
}

export interface UpdateOrderRequest {
  customerName?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status?: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  processedBy?: string | null;
  discountAmount?: number;
  deliveryFee?: number;
  serviceFee?: number;
  cashReceived?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
  authorizedBy?: string | null;
  paidAt?: string | null;
  linkedOrderId?: string | null;
}

// NEW: Order item add-on in response
export interface OrderItemAddonResponse {
  id: string;
  addonItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;      // For loyalty tracking from POS
  loyaltyCardCode: string | null;    // Physical loyalty card code
  tableNumber: string | null;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status: OrderStatus;
  subtotal: number;
  tax: number;
  totalAmount: number;
  discountAmount: number;
  deliveryFee: number;
  serviceFee: number;
  cashReceived: number | null;
  changeAmount: number | null;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  moodContext: string | null;
  moodFeedbackGiven: boolean;
  linkedOrderId: string | null;
  createdBy: string | null;
  processedBy: string | null;  // Cashier who processed the order
  deviceId: string | null;
  notes: string | null;  // Reason for void/write-off/etc.
  authorizedBy: string | null;  // Manager who authorized the action
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  paidAt: string | null;  // When payment was received
  // Loyalty info (included when payment is processed)
  loyaltyStampAwarded?: boolean;
  loyaltyMessage?: string;
  loyaltyRewardUnlocked?: boolean;
  currentStamps?: number;
  availableRewards?: number;
  order_items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    subtotal: number;
    status: OrderItemStatus;
    variantId?: string | null;       // NEW: Selected variant
    notes?: string | null;           // NEW: Special instructions
    variant?: {                       // NEW: Variant details
      id: string;
      name: string;
      priceDelta: number;
    } | null;
    order_item_addons?: OrderItemAddonResponse[];  // NEW: Selected add-ons
    createdAt: string;
    updatedAt: string;
  }>;
}
export const ordersApi = {
  // Get all orders (optionally filtered by status)
  getAll: async (status?: string): Promise<OrderResponse[]> => {
    const url = status ? `/api/orders?status=${status}` : '/api/orders';
    const response = await api.get(url);
    return response.data;
  },

  // Get order by ID
  getById: async (id: string): Promise<OrderResponse> => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },

  // Track order by order number (for guests)
  trackByOrderNumber: async (orderNumber: string): Promise<OrderResponse> => {
    const response = await api.get(`/api/orders/track/${orderNumber}`);
    return response.data;
  },

  // Get orders for current device (guest tracking)
  getMyOrders: async (): Promise<OrderResponse[]> => {
    const deviceId = getDeviceId();
    const response = await api.get('/api/orders', { 
      params: { deviceId, limit: 20 } 
    });
    return response.data;
  },

  // Create new order (automatically includes device ID for guests)
  create: async (data: CreateOrderRequest): Promise<OrderResponse> => {
    const deviceId = getDeviceId();
    const response = await api.post('/api/orders', { ...data, deviceId });
    return response.data;
  },

  // Update order
  update: async (id: string, data: UpdateOrderRequest): Promise<OrderResponse> => {
    const response = await api.put(`/api/orders/${id}`, data);
    return response.data;
  },

  // Delete order
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/orders/${id}`);
  },

  // Update order status
  updateStatus: async (id: string, status: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/status`, { status });
    return response.data;
  },

  // Mark order as paid
  markAsPaid: async (id: string, paymentMethod: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/payment`, { paymentMethod });
    return response.data;
  },

  // Get linked orders (reorders)
  getLinkedOrders: async (id: string): Promise<OrderResponse[]> => {
    const response = await api.get(`/api/orders/${id}/linked`);
    return response.data;
  },

  // Merge orders for single receipt/payment
  mergeOrders: async (orderIds: string[]): Promise<{
    success: boolean;
    data: {
      mergedOrderIds: string[];
      orderNumbers: string[];
      customerName: string | null;
      tableNumber: string | null;
      items: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        price: number;
        subtotal: number;
      }>;
      subtotal: number;
      tax: number;
      totalAmount: number;
      orderType: string;
    };
  }> => {
    const response = await api.post('/api/orders/merge', { orderIds });
    return response.data;
  },

  // Mark merged orders as paid
  markMergedOrdersAsPaid: async (orderIds: string[], paymentMethod: string): Promise<OrderResponse[]> => {
    const response = await api.post('/api/orders/merge/pay', { orderIds, paymentMethod });
    return response.data.data;
  },

  // Void an order (requires manager authorization)
  voidOrder: async (id: string, reason: string, authorizedBy: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/void`, { reason, authorizedBy });
    return response.data;
  },

  // Refund a paid order (requires manager authorization)
  refundOrder: async (id: string, reason: string, authorizedBy: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/refund`, { reason, authorizedBy });
    return response.data;
  },

  // Mark order as complimentary (requires manager authorization)
  markAsComplimentary: async (id: string, reason: string, authorizedBy: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/complimentary`, { reason, authorizedBy });
    return response.data;
  },

  // Write off an unpaid order (customer left without paying, requires manager authorization)
  writeOff: async (id: string, reason: string, authorizedBy: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}/write-off`, { reason, authorizedBy });
    return response.data;
  },

  // Mark order as paid with optional payment method
  markAsPaidSimple: async (id: string, paymentMethod?: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${id}`, { 
      paymentStatus: 'PAID', 
      paymentMethod: paymentMethod || 'CASH',
      paidAt: new Date().toISOString()
    });
    return response.data;
  },

  // ============================================
  // TAB ORDER METHODS (Item-level management)
  // ============================================

  // Add items to an existing tab order (unpaid order)
  addItemsToTab: async (orderId: string, items: OrderItem[]): Promise<OrderResponse> => {
    const response = await api.post(`/api/orders/${orderId}/items`, { items });
    return response.data;
  },

  // Update individual order item status
  updateOrderItemStatus: async (orderId: string, itemId: string, status: 'PREPARING' | 'COMPLETED' | 'VOIDED'): Promise<any> => {
    const response = await api.patch(`/api/orders/${orderId}/items/${itemId}/status`, { status });
    return response.data;
  },

  // Mark all items in a tab order as completed
  markAllItemsCompleted: async (orderId: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${orderId}/items/complete-all`);
    return response.data;
  },

  // Void a single order item (requires manager authorization)
  voidOrderItem: async (orderId: string, itemId: string, reason: string, authorizedBy: string): Promise<OrderResponse> => {
    const response = await api.patch(`/api/orders/${orderId}/items/${itemId}/void`, { reason, authorizedBy });
    return response.data;
  },
};
