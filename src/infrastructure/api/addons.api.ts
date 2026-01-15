import { api } from './axiosConfig';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MenuItemType = 'BASE' | 'ADDON' | 'DRINK';

export interface VariantDTO {
  id: string;
  menuItemId: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  outOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariantDTO {
  menuItemId: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateVariantDTO {
  name?: string;
  priceDelta?: number;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  outOfStock?: boolean;
}

export interface AddonItemDTO {
  id: string;
  name: string;
  price: number;
  image: string | null;
  description: string | null;
  available?: boolean;
}

export interface MenuItemAddonLinkDTO {
  id: string;
  baseItemId: string;
  addonItemId: string;
  maxQuantity: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  addon_item?: AddonItemDTO;
}

export interface CreateAddonLinkDTO {
  baseItemId: string;
  addonItemId: string;
  maxQuantity?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateAddonLinkDTO {
  maxQuantity?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateAddonMenuItemDTO {
  name: string;
  categoryId: string;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  available?: boolean;
  prepTime?: number;
}

export interface MenuItemWithAddonsDTO {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  image: string | null;
  description: string | null;
  available: boolean;
  featured: boolean;
  prepTime: number | null;
  nutrients: string | null;
  moodBenefits: string | null;
  itemType: MenuItemType;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    displayName: string;
  };
  variants?: VariantDTO[];
  allowed_addons?: Array<{
    id: string;
    maxQuantity: number;
    sortOrder: number;
    addon_item: AddonItemDTO;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemAddonDTO {
  addonItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface PricedAddonDTO {
  addonItemId: string;
  addonName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PricedOrderItemDTO {
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  variantPriceDelta: number;
  addons: PricedAddonDTO[];
  addonTotal: number;
  unitPrice: number;
  subtotal: number;
}

export interface CalculatePriceResponse {
  items: PricedOrderItemDTO[];
  subtotal: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export const addonsApi = {
  // ============================================================================
  // VARIANTS
  // ============================================================================
  
  /** Create a variant for a menu item */
  createVariant: async (data: CreateVariantDTO): Promise<VariantDTO> => {
    const response = await api.post('/api/addons/variants', data);
    return response.data;
  },

  /** Create multiple variants for a menu item at once */
  createBulkVariants: async (menuItemId: string, variants: Array<{
    name: string;
    priceDelta: number;
    isDefault?: boolean;
  }>): Promise<{ created: number }> => {
    const response = await api.post('/api/addons/variants/bulk', { menuItemId, variants });
    return response.data;
  },

  /** Update a variant */
  updateVariant: async (id: string, data: UpdateVariantDTO): Promise<VariantDTO> => {
    const response = await api.put(`/api/addons/variants/${id}`, data);
    return response.data;
  },

  /** Delete a variant */
  deleteVariant: async (id: string): Promise<void> => {
    await api.delete(`/api/addons/variants/${id}`);
  },

  /** Get variants for a menu item */
  getVariantsByMenuItem: async (menuItemId: string, includeInactive = false): Promise<VariantDTO[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await api.get(`/api/addons/variants/menu-item/${menuItemId}${params}`);
    return response.data;
  },

  // ============================================================================
  // ADD-ON LINKS (which add-ons are allowed for which base items)
  // ============================================================================

  /** Link an add-on to a base item */
  linkAddonToBaseItem: async (data: CreateAddonLinkDTO): Promise<MenuItemAddonLinkDTO> => {
    const response = await api.post('/api/addons/links', data);
    return response.data;
  },

  /** Bulk link multiple add-ons to a base item */
  bulkLinkAddons: async (baseItemId: string, addonItemIds: string[]): Promise<{ linked: number }> => {
    const response = await api.post('/api/addons/links/bulk', { baseItemId, addonItemIds });
    return response.data;
  },

  /** Update add-on link settings */
  updateAddonLink: async (id: string, data: UpdateAddonLinkDTO): Promise<MenuItemAddonLinkDTO> => {
    const response = await api.put(`/api/addons/links/${id}`, data);
    return response.data;
  },

  /** Remove add-on link */
  unlinkAddon: async (id: string): Promise<void> => {
    await api.delete(`/api/addons/links/${id}`);
  },

  /** Get allowed add-ons for a base item */
  getAddonsForBaseItem: async (baseItemId: string, includeInactive = false): Promise<MenuItemAddonLinkDTO[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await api.get(`/api/addons/links/base-item/${baseItemId}${params}`);
    return response.data;
  },

  // ============================================================================
  // ADD-ON MENU ITEMS
  // ============================================================================

  /** Create a new add-on menu item (itemType = ADDON) */
  createAddonMenuItem: async (data: CreateAddonMenuItemDTO): Promise<AddonItemDTO> => {
    const response = await api.post('/api/addons/items', data);
    return response.data;
  },

  /** Get all add-on menu items */
  getAllAddonMenuItems: async (includeUnavailable = false): Promise<AddonItemDTO[]> => {
    const params = includeUnavailable ? '?includeUnavailable=true' : '';
    const response = await api.get(`/api/addons/items${params}`);
    return response.data;
  },

  // ============================================================================
  // EXTENDED QUERIES
  // ============================================================================

  /** Get menu item with all variants and allowed add-ons */
  getMenuItemWithAddons: async (menuItemId: string): Promise<MenuItemWithAddonsDTO | null> => {
    const response = await api.get(`/api/addons/menu-item/${menuItemId}/full`);
    return response.data;
  },

  /** Get menu items for browsing (excludes ADDON items) */
  getMenuItemsForBrowsing: async (filters?: {
    categoryId?: string;
    available?: boolean;
    featured?: boolean;
    search?: string;
  }): Promise<MenuItemWithAddonsDTO[]> => {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.available !== undefined) params.append('available', String(filters.available));
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/api/addons/browse?${params}`);
    return response.data;
  },

  // ============================================================================
  // PRICE CALCULATION
  // ============================================================================

  /** Calculate price for items with variants and add-ons */
  calculatePrice: async (items: Array<{
    menuItemId: string;
    quantity: number;
    variantId?: string;
    addons?: Array<{
      addonItemId: string;
      quantity: number;
    }>;
  }>): Promise<CalculatePriceResponse> => {
    const response = await api.post('/api/addons/calculate-price', { items });
    return response.data;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate order item subtotal locally (for UI responsiveness)
 * Formula: (basePrice + variantDelta + SUM(addon.price * addon.qty)) * quantity
 */
export function calculateOrderItemSubtotal(params: {
  basePrice: number;
  variantPriceDelta?: number;
  addons?: Array<{ unitPrice: number; quantity: number }>;
  quantity: number;
}): number {
  const addonTotal = (params.addons || []).reduce(
    (sum, addon) => sum + (addon.unitPrice * addon.quantity),
    0
  );
  const unitPrice = params.basePrice + (params.variantPriceDelta || 0) + addonTotal;
  return unitPrice * params.quantity;
}

/**
 * Format add-on display name with quantity
 */
export function formatAddonDisplay(addon: { name: string; quantity: number; unitPrice: number }): string {
  if (addon.quantity === 1) {
    return `+ ${addon.name} (₱${addon.unitPrice.toFixed(2)})`;
  }
  return `+ ${addon.name} ×${addon.quantity} (₱${(addon.unitPrice * addon.quantity).toFixed(2)})`;
}
