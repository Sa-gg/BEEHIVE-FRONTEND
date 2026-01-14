import { api } from './axiosConfig';

export interface CategoryDTO {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithItemsDTO extends CategoryDTO {
  menuItems: Array<{
    id: string;
    name: string;
    price: number;
    available: boolean;
    featured: boolean;
  }>;
  _count: {
    menuItems: number;
  };
}

export interface CreateCategoryDTO {
  name: string;
  displayName: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  displayName?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

export const categoriesApi = {
  // Get all categories
  getAll: async (includeInactive: boolean = false) => {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', 'true');
    
    const response = await api.get<ApiResponse<CategoryDTO[]>>(`/api/categories?${params}`);
    return response.data;
  },

  // Get category by ID
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<CategoryDTO>>(`/api/categories/${id}`);
    return response.data;
  },

  // Create a new category
  create: async (data: CreateCategoryDTO) => {
    const response = await api.post<ApiResponse<CategoryDTO>>('/api/categories', data);
    return response.data;
  },

  // Update a category
  update: async (id: string, data: UpdateCategoryDTO) => {
    const response = await api.put<ApiResponse<CategoryDTO>>(`/api/categories/${id}`, data);
    return response.data;
  },

  // Delete a category (soft delete by default)
  delete: async (id: string, force: boolean = false) => {
    const params = new URLSearchParams();
    if (force) params.append('force', 'true');
    
    const response = await api.delete<ApiResponse<null>>(`/api/categories/${id}?${params}`);
    return response.data;
  },

  // Reorder categories
  reorder: async (categoryOrders: Array<{ id: string; sortOrder: number }>) => {
    // Backend expects categoryIds array, not categoryOrders object array
    const categoryIds = categoryOrders.map(c => c.id);
    const response = await api.post<ApiResponse<CategoryDTO[]>>('/api/categories/reorder', { 
      categoryIds 
    });
    return response.data;
  },

  // Get category with menu items
  getWithMenuItems: async (id: string) => {
    const response = await api.get<ApiResponse<CategoryWithItemsDTO>>(`/api/categories/${id}/items`);
    return response.data;
  }
};
