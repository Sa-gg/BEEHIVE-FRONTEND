import { api } from './axiosConfig';

export interface Settings {
  openTime: string;
  closeTime: string;
  lastResetDate: string | null;
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
};
