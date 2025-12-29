import { api } from './axiosConfig';
import { getDeviceId } from '../../shared/utils/deviceId';

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  customerName?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  moodContext?: string;
  linkedOrderId?: string;
  createdBy?: string;
  items: OrderItem[];
  paymentMethod?: string;
  deviceId?: string; // For guest tracking
}

export interface UpdateOrderRequest {
  customerName?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentMethod?: string;
  paymentStatus?: 'UNPAID' | 'PAID' | 'REFUNDED';
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  customerName: string | null;
  tableNumber: string | null;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  moodContext: string | null;
  moodFeedbackGiven: boolean;
  linkedOrderId: string | null;
  createdBy: string | null;
  processedBy: string | null;  // Cashier who processed the order
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  order_items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    subtotal: number;
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
};
