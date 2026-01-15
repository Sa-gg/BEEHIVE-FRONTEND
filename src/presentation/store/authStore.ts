import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type User } from '../../infrastructure/api/auth.api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name: string, email?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          
          // Store token in axios defaults
          const axiosModule = await import('../../infrastructure/api/axiosConfig');
          axiosModule.api.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || 'Login failed');
        }
      },

      register: async (phone: string, password: string, name: string, email?: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register({ 
            phone, 
            password, 
            name, 
            email,
            role: 'CUSTOMER' 
          });
          
          // Store token in axios defaults
          const axiosModule = await import('../../infrastructure/api/axiosConfig');
          axiosModule.api.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.error || 'Registration failed');
        }
      },

      logout: () => {
        // Clear token from axios defaults
        import('../../infrastructure/api/axiosConfig').then(axiosModule => {
          delete axiosModule.api.defaults.headers.common['Authorization'];
        });
        
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          // Set token in axios defaults
          const axiosModule = await import('../../infrastructure/api/axiosConfig');
          axiosModule.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true });
        } catch (error) {
          // Token is invalid, clear auth state
          get().logout();
        }
      },

      setUser: (user: User) => {
        set({ user });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
