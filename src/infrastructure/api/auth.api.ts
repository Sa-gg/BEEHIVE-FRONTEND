import { api } from './axiosConfig';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  name: string;
  email?: string;
  role?: 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN';
  phone?: string;
  loyaltyPoints: number;
  cardNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/api/auth/me');
    return response.data;
  },

  async updateMe(data: { name?: string; phone?: string }): Promise<User> {
    const response = await api.put<User>('/api/auth/me', data);
    return response.data;
  },

  async getAllUsers(role?: string): Promise<User[]> {
    const response = await api.get<User[]>('/api/auth/users', {
      params: role ? { role } : undefined
    });
    return response.data;
  },

  async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const response = await api.put<User>(`/api/auth/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/auth/users/${id}`);
  },

  async addLoyaltyPoints(userId: string, points: number): Promise<User> {
    const response = await api.post<User>('/api/auth/loyalty-points', { userId, points });
    return response.data;
  },

  // Validate manager PIN for authorization
  async validateManagerPin(pin: string): Promise<{ valid: boolean; manager?: { id: string; name: string } }> {
    const response = await api.post<{ valid: boolean; manager?: { id: string; name: string } }>('/api/auth/validate-manager-pin', { pin });
    return response.data;
  }
};
