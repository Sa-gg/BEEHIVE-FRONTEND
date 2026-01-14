import { api } from './axiosConfig';

const API_URL = '/api/stock-transactions';

export interface StockTransaction {
  id: string;
  inventoryItemId: string;
  type: 'IN' | 'OUT';
  reason: 'PURCHASE' | 'ORDER' | 'WASTE' | 'ADJUSTMENT' | 'RECONCILIATION' | 'VOID' | 'CREATED' | 'EDITED';
  quantity: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status: 'NORMAL' | 'DISCREPANCY';
  referenceId?: string;
  receiptImage?: string;
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
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface StockOutParams {
  inventoryItemId: string;
  quantity: number;
  reason: 'ORDER' | 'WASTE' | 'ADJUSTMENT';
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface AdjustStockParams {
  inventoryItemId: string;
  newStock: number;
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface UpdateTransactionMetadataParams {
  notes?: string;
  referenceId?: string;
  receiptImage?: string;
}

export interface TransactionMetadataAuditLog {
  id: string;
  transactionId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface BulkStockItem {
  inventoryItemId: string;
  quantity: number;
}

export interface BulkStockInParams {
  items: BulkStockItem[];
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface BulkStockOutParams {
  items: BulkStockItem[];
  reason: 'WASTE' | 'ADJUSTMENT';
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface BulkStockResult {
  successful: Array<{ inventoryItemId: string; itemName: string; quantity: number; newStock: number }>;
  failed: Array<{ inventoryItemId: string; itemName?: string; error: string }>;
  totalAdded?: number;
  totalRemoved?: number;
  discrepancies?: number;
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

  // Bulk Stock-In: Add inventory to multiple items
  bulkStockIn: async (params: BulkStockInParams): Promise<BulkStockResult> => {
    const response = await api.post(`${API_URL}/bulk/in`, params);
    return response.data.data;
  },

  // Bulk Stock-Out: Remove inventory from multiple items
  bulkStockOut: async (params: BulkStockOutParams): Promise<BulkStockResult> => {
    const response = await api.post(`${API_URL}/bulk/out`, params);
    return response.data.data;
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

  // Get single transaction with audit log
  getTransaction: async (transactionId: string) => {
    const response = await api.get(`${API_URL}/${transactionId}`);
    return response.data.data as StockTransaction & { auditLog?: TransactionMetadataAuditLog[] };
  },

  // Update transaction metadata (receipt, reference, notes) - does NOT create new transaction
  updateTransactionMetadata: async (transactionId: string, params: UpdateTransactionMetadataParams) => {
    const response = await api.patch(`${API_URL}/${transactionId}/metadata`, params);
    return response.data;
  },

  // Get audit logs for a transaction
  getAuditLogs: async (transactionId: string) => {
    const response = await api.get(`${API_URL}/${transactionId}/audit-logs`);
    return response.data.data as TransactionMetadataAuditLog[];
  },
};
