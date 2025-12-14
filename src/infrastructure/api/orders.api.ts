import { api } from './axiosConfig';

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
  items: OrderItem[];
  paymentMethod?: string;
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

  // Create new order
  create: async (data: CreateOrderRequest): Promise<OrderResponse> => {
    const response = await api.post('/api/orders', data);
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
};
