import { api } from './axiosConfig';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
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
  }
};
