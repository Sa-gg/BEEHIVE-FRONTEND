import { api } from './axiosConfig';

export interface Settings {
  openTime: string;
  closeTime: string;
  lastResetDate: string | null;
}

export interface AutoStockSettings {
  autoOutOfStockWhenIngredientsRunOut: boolean;
  autoMarkInStockWhenAvailable: boolean;
}

export interface StockStatusUpdateResult {
  success: boolean;
  message: string;
  markedOutOfStock: Array<{ id: string; name: string }>;
  markedInStock: Array<{ id: string; name: string }>;
}

// Global settings shared across all accounts
export interface GlobalSettings {
  openTime: string;
  closeTime: string;
  lastResetDate: string | null;
  
  // Auto-stock management settings
  autoOutOfStockWhenIngredientsRunOut: boolean;
  autoMarkInStockWhenAvailable: boolean;
  
  // Payment settings
  cashChangeEnabled: boolean;
  
  // Printing settings
  printKitchenCopy: boolean;
  printKitchenCopyForOpenTab: boolean;
  
  // Experimental features
  linkedOrdersEnabled: boolean;
  loyaltySystemEnabled: boolean;
  
  // Order permissions
  allowVoidOrderItem: boolean;
  
  // Cashier permissions (whether actions require manager PIN)
  cashierCanVoidWithoutPin: boolean;
  cashierCanRefundWithoutPin: boolean;
  cashierCanComplimentaryWithoutPin: boolean;
  cashierCanWriteOffWithoutPin: boolean;
  cashierCanVoidAndReorderWithoutPin: boolean;
  
  // Cashier POS permissions
  cashierCanApplyServiceAmount: boolean;
  cashierCanApplyDiscount: boolean;
  cashierCanApplyDeliveryAmount: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<Settings> => {
    const response = await api.get<Settings>('/api/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await api.patch<Settings>('/api/settings', settings);
    return response.data;
  },

  forceResetOrderNumbers: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/settings/force-reset');
    return response.data;
  },
  
  validateManagerPin: async (pin: string): Promise<{ valid: boolean }> => {
    const response = await api.post<{ valid: boolean }>('/api/settings/validate-pin', { pin });
    return response.data;
  },
  
  updateManagerPin: async (currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/settings/update-pin', { currentPin, newPin });
    return response.data;
  },
  
  // Auto-stock settings
  getAutoStockSettings: async (): Promise<AutoStockSettings> => {
    const response = await api.get<AutoStockSettings>('/api/settings/auto-stock');
    return response.data;
  },
  
  updateAutoStockSettings: async (settings: Partial<AutoStockSettings>): Promise<AutoStockSettings & { success: boolean }> => {
    const response = await api.patch<AutoStockSettings & { success: boolean }>('/api/settings/auto-stock', settings);
    return response.data;
  },
  
  // Manually trigger stock status update for all menu items
  triggerStockStatusUpdate: async (): Promise<StockStatusUpdateResult> => {
    const response = await api.post<StockStatusUpdateResult>('/api/settings/auto-stock/trigger');
    return response.data;
  },
  
  // Global settings (shared across all accounts)
  getGlobalSettings: async (): Promise<{ success: boolean; settings: GlobalSettings }> => {
    const response = await api.get<{ success: boolean; settings: GlobalSettings }>('/api/settings/global');
    return response.data;
  },
  
  updateGlobalSettings: async (settings: Partial<GlobalSettings>): Promise<{ success: boolean; settings: GlobalSettings }> => {
    const response = await api.patch<{ success: boolean; settings: GlobalSettings }>('/api/settings/global', settings);
    return response.data;
  },
};
