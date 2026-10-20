import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types/index';
import apiClient from '../utils/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  authChecked: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const loadStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    if (storedUser && token) {
      return JSON.parse(storedUser);
    }
    return null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: loadStoredUser(),
  isLoading: false,
  authChecked: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, accessToken } = response.data;
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, error: null, authChecked: true });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', data);
      const { user, accessToken } = response.data;
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, error: null, authChecked: true });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    set({ user: null, error: null, authChecked: true });
  },

  checkAuth: async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('authToken');
      if (storedUser && token) {
        set({ user: JSON.parse(storedUser), authChecked: true });
      } else {
        set({ user: null, authChecked: true });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, authChecked: true });
    }
  },
}));
