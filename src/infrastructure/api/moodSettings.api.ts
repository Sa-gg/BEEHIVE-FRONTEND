import { api } from './axiosConfig';

// Types
export interface MoodSetting {
  id: string;
  mood: string;
  emoji: string;
  label: string;
  color: string;
  description: string;
  supportMessage: string | null;
  scientificExplanation: string | null;
  beneficialNutrients: string[];
  preferredCategories: string[];
  excludeCategories: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoodFeedbackConfig {
  id: string;
  baselineThreshold: number;
  feedbackEnabled: boolean;
  autoEnableFeedback: boolean;
  orderRateWeight: number;
  feedbackRateWeight: number;
  moodBenefitsWeight: number;
  preferredCategoryWeight: number;
  featuredItemWeight: number;
  priceRangeWeight: number;
  historicalDataWeight: number;
  timeOfDayWeight: number;
  showMoodReflection: boolean;
  reflectionDelayMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface MoodAnalytics {
  mood: string;
  totalShown: number;
  totalOrdered: number;
  orderRate: number;
  feedbackCount: number;
  moodImproved: number;
  moodSame: number;
  moodWorse: number;
  improvementRate: number;
  historicalScore: number;
  baselineReached: boolean;
  baselineProgress: number;
}

export interface UpdateMoodSettingDTO {
  emoji?: string;
  label?: string;
  color?: string;
  description?: string;
  supportMessage?: string | null;
  scientificExplanation?: string | null;
  beneficialNutrients?: string[];
  preferredCategories?: string[];
  excludeCategories?: string[];
  isActive?: boolean;
}

export interface UpdateFeedbackConfigDTO {
  baselineThreshold?: number;
  feedbackEnabled?: boolean;
  autoEnableFeedback?: boolean;
  orderRateWeight?: number;
  feedbackRateWeight?: number;
  moodBenefitsWeight?: number;
  preferredCategoryWeight?: number;
  featuredItemWeight?: number;
  priceRangeWeight?: number;
  historicalDataWeight?: number;
  timeOfDayWeight?: number;
  showMoodReflection?: boolean;
  reflectionDelayMinutes?: number;
}

// API Functions
export const moodSettingsApi = {
  // ==================== MOOD SETTINGS ====================
  
  getAllMoodSettings: async (): Promise<MoodSetting[]> => {
    const response = await api.get('/mood-settings');
    return response.data;
  },

  getActiveMoodSettings: async (): Promise<MoodSetting[]> => {
    const response = await api.get('/mood-settings/active');
    return response.data;
  },

  getMoodSetting: async (mood: string): Promise<MoodSetting> => {
    const response = await api.get(`/mood-settings/${mood}`);
    return response.data;
  },

  updateMoodSetting: async (mood: string, data: UpdateMoodSettingDTO): Promise<MoodSetting> => {
    const response = await api.put(`/mood-settings/${mood}`, data);
    return response.data;
  },

  initializeMoodSettings: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post('/mood-settings/initialize/settings');
    return response.data;
  },

  // ==================== FEEDBACK CONFIG ====================

  getFeedbackConfig: async (): Promise<MoodFeedbackConfig> => {
    const response = await api.get('/mood-settings/feedback-config');
    return response.data;
  },

  updateFeedbackConfig: async (data: UpdateFeedbackConfigDTO): Promise<MoodFeedbackConfig> => {
    const response = await api.put('/mood-settings/feedback-config/update', data);
    return response.data;
  },

  // ==================== ANALYTICS & STATS ====================

  getMoodAnalytics: async (): Promise<MoodAnalytics[]> => {
    const response = await api.get('/mood-settings/stats/analytics');
    return response.data;
  },

  getMoodOrderStats: async (): Promise<any[]> => {
    const response = await api.get('/mood-settings/stats/all');
    return response.data;
  },

  resetMoodStats: async (mood?: string): Promise<{ message: string }> => {
    const url = mood ? `/mood-settings/stats/reset/${mood}` : '/mood-settings/stats/reset';
    const response = await api.post(url);
    return response.data;
  },

  // ==================== TRACKING (for customer app) ====================

  trackMoodShown: async (mood: string): Promise<any> => {
    const response = await api.post(`/mood-settings/track/shown/${mood}`);
    return response.data;
  },

  trackMoodOrdered: async (mood: string): Promise<any> => {
    const response = await api.post(`/mood-settings/track/ordered/${mood}`);
    return response.data;
  },

  recordMoodFeedback: async (mood: string, outcome: 'improved' | 'same' | 'worse'): Promise<any> => {
    const response = await api.post(`/mood-settings/track/feedback/${mood}`, { outcome });
    return response.data;
  },

  // ==================== INITIALIZATION ====================

  initializeAll: async (): Promise<any> => {
    const response = await api.post('/mood-settings/initialize/all');
    return response.data;
  }
};
