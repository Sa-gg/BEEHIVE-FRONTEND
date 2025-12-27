import { api } from './axiosConfig';

const API_URL = '/api/inventory';

export interface InventoryItemDTO {
  id: string;
  name: string;
  category: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  restockFrequencyDays: number | null;
  lastRestocked: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItemRequest {
  name: string;
  category: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  restockFrequencyDays?: number;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  category?: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES';
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  costPerUnit?: number;
  supplier?: string;
  restockFrequencyDays?: number;
}

export interface InventoryStats {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export const inventoryApi = {
  async getAll(filters?: { 
    category?: string; 
    status?: string; 
    search?: string; 
  }): Promise<InventoryItemDTO[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`${API_URL}?${params.toString()}`);
    return response.data.map((item: InventoryItemDTO) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : null
    }));
  },

  async getById(id: string): Promise<InventoryItemDTO> {
    const response = await api.get(`${API_URL}/${id}`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      lastRestocked: response.data.lastRestocked ? new Date(response.data.lastRestocked) : null
    };
  },

  async create(data: CreateInventoryItemRequest): Promise<InventoryItemDTO> {
    const response = await api.post(API_URL, data);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      lastRestocked: response.data.lastRestocked ? new Date(response.data.lastRestocked) : null
    };
  },

  async update(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItemDTO> {
    const response = await api.put(`${API_URL}/${id}`, data);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      lastRestocked: response.data.lastRestocked ? new Date(response.data.lastRestocked) : null
    };
  },

  async updateStock(id: string, stock: number): Promise<InventoryItemDTO> {
    const response = await api.patch(`${API_URL}/${id}/stock`, { stock });
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      lastRestocked: response.data.lastRestocked ? new Date(response.data.lastRestocked) : null
    };
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${API_URL}/${id}`);
  },

  async getStats(): Promise<InventoryStats> {
    const response = await api.get(`${API_URL}/stats`);
    return response.data;
  },

  async getAlerts(): Promise<{
    lowStock: InventoryItemDTO[];
    outOfStock: InventoryItemDTO[];
    total: number;
  }> {
    const response = await api.get(`${API_URL}/alerts`);
    return {
      lowStock: response.data.lowStock.map((item: InventoryItemDTO) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : null
      })),
      outOfStock: response.data.outOfStock.map((item: InventoryItemDTO) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : null
      })),
      total: response.data.total
    };
  }
};
