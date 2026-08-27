import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api';
import { getServerUrl } from '../utils/serverDiscovery';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInitialized: boolean;
  login: (credentials: { cin: string; phone: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  touchSession: () => Promise<void>;
}

async function getSessionAgeMs(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync('lastActiveAt');
    return raw ? Date.now() - Number(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const age = await getSessionAgeMs();
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if ((age !== null && age > SESSION_TIMEOUT_MS) || !token || !user) {
        if (token) await SecureStore.deleteItemAsync('token');
        if (userStr) await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('lastActiveAt');
        return;
      }

      set({
        token,
        user,
        isAuthenticated: true,
        isAdmin: user.role === 'admin' || user.role === 'super_admin',
      });
    } catch (e) {
      console.error('Failed to initialize auth', e);
    } finally {
      set({ isInitialized: true });
    }
  },

  touchSession: async () => {
    if (!get().isAuthenticated) return;
    const age = await getSessionAgeMs();
    if (age !== null && age > SESSION_TIMEOUT_MS) {
      await get().logout();
      return;
    }
    await SecureStore.setItemAsync('lastActiveAt', String(Date.now()));
  },

  login: async (credentials) => {
    try {
      const data = await authApi.login(credentials);

      const allowedRoles = ['user', 'admin', 'super_admin'];
      if (!allowedRoles.includes(data.user.role)) {
        throw new Error("Accès réservé aux administrateurs.");
      }

      await SecureStore.setItemAsync('token', data.access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      await SecureStore.setItemAsync('lastActiveAt', String(Date.now()));

      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isAdmin: data.user.role === 'admin' || data.user.role === 'super_admin',
      });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout API call failed:', e);
    }
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('lastActiveAt');
    set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
  },
}));

export { getServerUrl };
