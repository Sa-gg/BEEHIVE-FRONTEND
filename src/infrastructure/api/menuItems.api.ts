import { api } from './axiosConfig';

export interface MenuItemDTO {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number | null;
  image: string | null;
  description: string | null;
  available: boolean;
  featured: boolean;
  prepTime: number | null;
  nutrients: string | null;
  moodBenefits: string | null;
  moodOrderStats: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemDTO {
  name: string;
  category: string;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  available?: boolean;
  featured?: boolean;
  prepTime?: number;
  nutrients?: string;
  moodBenefits?: string;
}

export interface UpdateMenuItemDTO {
  name?: string;
  category?: string;
  price?: number;
  cost?: number;
  image?: string;
  description?: string;
  available?: boolean;
  featured?: boolean;
  prepTime?: number;
  nutrients?: string;
  moodBenefits?: string;
}

export interface MenuItemFilters {
  category?: string;
  available?: boolean;
  featured?: boolean;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

export const menuItemsApi = {
  // Get all menu items with optional filters
  getAll: async (filters?: MenuItemFilters) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.available !== undefined) params.append('available', String(filters.available));
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<MenuItemDTO[]>>(`/api/menu-items?${params}`);
    return response.data;
  },

  // Get menu item by ID
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<MenuItemDTO>>(`/api/menu-items/${id}`);
    return response.data;
  },

  // Create new menu item
  create: async (data: CreateMenuItemDTO) => {
    const response = await api.post<ApiResponse<MenuItemDTO>>('/api/menu-items', data);
    return response.data;
  },

  // Update menu item
  update: async (id: string, data: UpdateMenuItemDTO) => {
    const response = await api.put<ApiResponse<MenuItemDTO>>(`/api/menu-items/${id}`, data);
    return response.data;
  },

  // Delete menu item
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/api/menu-items/${id}`);
    return response.data;
  },

  // Toggle availability
  toggleAvailability: async (id: string) => {
    const response = await api.patch<ApiResponse<MenuItemDTO>>(`/api/menu-items/${id}/availability`);
    return response.data;
  },

  // Toggle featured
  toggleFeatured: async (id: string) => {
    const response = await api.patch<ApiResponse<MenuItemDTO>>(`/api/menu-items/${id}/featured`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get<ApiResponse<{
      total: number;
      available: number;
      unavailable: number;
      featured: number;
    }>>('/api/menu-items/stats');
    return response.data;
  },

  // Track that items were shown for a mood
  trackMoodViews: async (itemIds: string[], mood: string) => {
    const response = await api.post<ApiResponse<void>>('/api/menu-items/track-views', {
      itemIds,
      mood
    });
    return response.data;
  },
};

// Upload API
export const uploadApi = {
  // Upload image file
  uploadImage: async (formData: FormData) => {
    const response = await api.post<ApiResponse<{
      path: string;
      filename: string;
      size: number;
      mimetype: string;
    }>>('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download image from URL
  downloadImageUrl: async (url: string) => {
    const response = await api.post<ApiResponse<{
      path: string;
      originalUrl: string;
    }>>('/api/upload/image-url', { url });
    return response.data;
  },
};
