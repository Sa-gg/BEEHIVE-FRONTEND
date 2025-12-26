import { api } from './axiosConfig';

const API_URL = '/api/recipes';

export interface MenuItemIngredient {
  id: string;
  menuItemId: string;
  inventoryItemId: string;
  quantity: number;
  inventory_item: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  };
}

export interface RecipeIngredient {
  inventoryItemId: string;
  quantity: number;
}

export const recipeApi = {
  // Add ingredient to recipe
  addIngredient: async (menuItemId: string, inventoryItemId: string, quantity: number) => {
    const response = await api.post(`${API_URL}/ingredients`, {
      menuItemId,
      inventoryItemId,
      quantity,
    });
    return response.data;
  },

  // Remove ingredient from recipe
  removeIngredient: async (menuItemId: string, inventoryItemId: string) => {
    const response = await api.delete(`${API_URL}/ingredients`, {
      data: { menuItemId, inventoryItemId },
    });
    return response.data;
  },

  // Get recipe for a menu item
  getRecipe: async (menuItemId: string) => {
    const response = await api.get(`${API_URL}/${menuItemId}`);
    return response.data.data as MenuItemIngredient[];
  },

  // Update entire recipe
  updateRecipe: async (menuItemId: string, ingredients: RecipeIngredient[]) => {
    const response = await api.put(`${API_URL}/${menuItemId}`, { ingredients });
    return response.data;
  },

  // Check menu item availability
  checkAvailability: async (menuItemId: string) => {
    const response = await api.get(`${API_URL}/${menuItemId}/availability`);
    return response.data.data;
  },

  // Calculate menu item cost
  calculateCost: async (menuItemId: string) => {
    const response = await api.get(`${API_URL}/${menuItemId}/cost`);
    return response.data.data;
  },

  // Get menu items using a specific ingredient
  getMenuItemsUsingIngredient: async (inventoryItemId: string) => {
    const response = await api.get(`${API_URL}/ingredient/${inventoryItemId}`);
    return response.data.data;
  },

  // Get maximum servings for all menu items (for POS stock display)
  getAllMaxServings: async (): Promise<Record<string, number>> => {
    const response = await api.get(`${API_URL}/max-servings`);
    return response.data.data;
  },

  // Get maximum servings accounting for cart items (shared ingredients)
  getMaxServingsWithCart: async (
    cartItems: Array<{ menuItemId: string; quantity: number }>
  ): Promise<Record<string, number>> => {
    const response = await api.post(`${API_URL}/max-servings-with-cart`, { cartItems });
    return response.data.data;
  },

  // Get maximum servings for a single menu item
  getMaxServings: async (menuItemId: string): Promise<number> => {
    const response = await api.get(`${API_URL}/${menuItemId}/max-servings`);
    return response.data.data.maxServings;
  },

  // Get menu items with low stock ingredients
  getMenuItemsWithLowStock: async () => {
    const response = await api.get(`${API_URL}/low-stock`);
    return response.data.data;
  },
};
