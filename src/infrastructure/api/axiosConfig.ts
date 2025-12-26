import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token from localStorage
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (zustand persist stores it there)
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        const token = state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to parse auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error: Cannot reach backend at', API_BASE_URL);
      console.error('Make sure backend is running and accessible from this device');
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
