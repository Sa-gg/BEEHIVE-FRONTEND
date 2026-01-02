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
  preferredCategoryPoints: number;
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
  excludedCategoryPenalty: number;   // Negative points for excluded category
  featuredItemWeight: number;
  priceRangeWeight: number;
  historicalDataWeight: number;
  timeOfDayWeight: number;
  explorationBonusWeight: number;    // Max UCB exploration bonus
  minimumOrdersThreshold: number;    // Min orders before trusting data
  day0PositionShuffle: boolean;      // Shuffle display order to prevent position bias
  // Time of day configuration
  morningStartHour: number;
  morningEndHour: number;
  afternoonEndHour: number;
  morningCategories: string;   // JSON string array
  afternoonCategories: string; // JSON string array
  eveningCategories: string;   // JSON string array
  // UI settings
  showMoodReflection: boolean;
  reflectionDelayMinutes: number;
  showRankingNumbers: boolean;   // Show ranking numbers on recommended items
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
  preferredCategoryPoints?: number;
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
  explorationBonusWeight?: number;
  minimumOrdersThreshold?: number;
  // Time of day configuration
  morningStartHour?: number;
  morningEndHour?: number;
  afternoonEndHour?: number;
  morningCategories?: string[];
  afternoonCategories?: string[];
  eveningCategories?: string[];
  // UI settings
  showMoodReflection?: boolean;
  reflectionDelayMinutes?: number;
}

// API Functions
export const moodSettingsApi = {
  // ==================== MOOD SETTINGS ====================
  
  getAllMoodSettings: async (): Promise<MoodSetting[]> => {
    const response = await api.get('/api/mood-settings');
    return response.data;
  },

  getActiveMoodSettings: async (): Promise<MoodSetting[]> => {
    const response = await api.get('/api/mood-settings/active');
    return response.data;
  },

  getMoodSetting: async (mood: string): Promise<MoodSetting> => {
    const response = await api.get(`/api/mood-settings/${mood}`);
    return response.data;
  },

  updateMoodSetting: async (mood: string, data: UpdateMoodSettingDTO): Promise<MoodSetting> => {
    const response = await api.put(`/api/mood-settings/${mood}`, data);
    return response.data;
  },

  initializeMoodSettings: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post('/api/mood-settings/initialize/settings');
    return response.data;
  },

  // ==================== FEEDBACK CONFIG ====================

  getFeedbackConfig: async (): Promise<MoodFeedbackConfig> => {
    const response = await api.get('/api/mood-settings/feedback-config');
    return response.data;
  },

  updateFeedbackConfig: async (data: UpdateFeedbackConfigDTO): Promise<MoodFeedbackConfig> => {
    const response = await api.put('/api/mood-settings/feedback-config/update', data);
    return response.data;
  },

  // ==================== ANALYTICS & STATS ====================

  getMoodAnalytics: async (): Promise<MoodAnalytics[]> => {
    const response = await api.get('/api/mood-settings/stats/analytics');
    return response.data;
  },

  getMoodOrderStats: async (): Promise<any[]> => {
    const response = await api.get('/api/mood-settings/stats/all');
    return response.data;
  },

  resetMoodStats: async (mood?: string): Promise<{ message: string }> => {
    const url = mood ? `/api/mood-settings/stats/reset/${mood}` : '/api/mood-settings/stats/reset';
    const response = await api.post(url);
    return response.data;
  },

  // ==================== TRACKING (for customer app) ====================

  // Track when mood recommendations are shown (with optional item IDs for per-item tracking)
  trackMoodShown: async (mood: string, menuItemIds?: string[]): Promise<any> => {
    const response = await api.post(`/api/mood-settings/track/shown/${mood}`, { menuItemIds });
    return response.data;
  },

  trackMoodOrdered: async (mood: string): Promise<any> => {
    const response = await api.post(`/api/mood-settings/track/ordered/${mood}`);
    return response.data;
  },

  recordMoodFeedback: async (mood: string, outcome: 'improved' | 'same' | 'worse', orderId: string): Promise<any> => {
    const response = await api.post(`/api/mood-settings/track/feedback/${mood}`, { outcome, orderId });
    return response.data;
  },

  // ==================== PER-ITEM MOOD ANALYTICS ====================

  getTopItemsForMood: async (mood: string, limit: number = 10): Promise<any> => {
    const response = await api.get(`/api/mood-settings/items/top/${mood}?limit=${limit}`);
    return response.data;
  },

  getDetailedMoodAnalytics: async (mood: string): Promise<any> => {
    const response = await api.get(`/api/mood-settings/stats/detailed/${mood}`);
    return response.data;
  },

  getMoodItemStats: async (mood: string): Promise<any> => {
    const response = await api.get(`/api/mood-settings/stats/items/${mood}`);
    return response.data;
  },

  getItemMoodStats: async (menuItemId: string): Promise<any> => {
    const response = await api.get(`/api/mood-settings/stats/item/${menuItemId}`);
    return response.data;
  },

  // ==================== INITIALIZATION ====================

  initializeAll: async (): Promise<any> => {
    const response = await api.post('/api/mood-settings/initialize/all');
    return response.data;
  },

  // ==================== RESET FUNCTIONS ====================

  // Reset all mood order stats (mood_order_stats table)
  resetAllMoodOrderStats: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/mood-settings/reset/mood-order-stats');
    return response.data;
  },

  // Reset mood order stats for a specific mood
  resetMoodOrderStatsByMood: async (mood: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/mood-settings/reset/mood-order-stats/${mood}`);
    return response.data;
  },

  // Reset all menu item mood stats (menu_item_mood_stats table)
  resetAllMenuItemMoodStats: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/mood-settings/reset/item-mood-stats');
    return response.data;
  },

  // Reset menu item mood stats for a specific mood
  resetMenuItemMoodStatsByMood: async (mood: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/mood-settings/reset/item-mood-stats/${mood}`);
    return response.data;
  },

  // Reset ALL mood statistics (both tables)
  resetAllMoodStatistics: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/mood-settings/reset/all');
    return response.data;
  }
};
