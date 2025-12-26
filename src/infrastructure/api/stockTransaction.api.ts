import { api } from './axiosConfig';

const API_URL = '/api/stock-transactions';

export interface StockTransaction {
  id: string;
  inventoryItemId: string;
  type: 'IN' | 'OUT';
  reason: 'PURCHASE' | 'ORDER' | 'WASTE' | 'ADJUSTMENT' | 'RECONCILIATION';
  quantity: number;
  referenceId?: string;
  userId?: string;
  notes?: string;
  createdAt: string;
  inventory_item?: {
    name: string;
    unit: string;
    category?: string;
  };
}

export interface StockInParams {
  inventoryItemId: string;
  quantity: number;
  reason?: 'PURCHASE' | 'RECONCILIATION';
  referenceId?: string;
  userId?: string;
  notes?: string;
}

export interface StockOutParams {
  inventoryItemId: string;
  quantity: number;
  reason: 'ORDER' | 'WASTE' | 'ADJUSTMENT';
  referenceId?: string;
  userId?: string;
  notes?: string;
}

export interface AdjustStockParams {
  inventoryItemId: string;
  newStock: number;
  userId?: string;
  notes?: string;
}

export const stockTransactionApi = {
  // Stock-In: Add inventory
  stockIn: async (params: StockInParams) => {
    const response = await api.post(`${API_URL}/in`, params);
    return response.data;
  },

  // Stock-Out: Remove inventory
  stockOut: async (params: StockOutParams) => {
    const response = await api.post(`${API_URL}/out`, params);
    return response.data;
  },

  // Adjust Stock: Manual adjustment
  adjustStock: async (params: AdjustStockParams) => {
    const response = await api.post(`${API_URL}/adjust`, params);
    return response.data;
  },

  // Get transaction history for an inventory item
  getTransactionHistory: async (inventoryItemId: string, limit = 50) => {
    const response = await api.get(
      `${API_URL}/history/${inventoryItemId}`,
      { params: { limit } }
    );
    return response.data.data as StockTransaction[];
  },

  // Get all transactions with filters
  getAllTransactions: async (filters?: {
    type?: 'IN' | 'OUT';
    reason?: 'PURCHASE' | 'ORDER' | 'WASTE' | 'ADJUSTMENT' | 'RECONCILIATION';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {
    const response = await api.get(API_URL, { params: filters });
    return response.data.data as StockTransaction[];
  },
};
