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
};
