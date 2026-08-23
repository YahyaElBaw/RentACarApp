import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, presenceApi } from '../api';
import router from '../router';

const getStored = (key: string) => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
};

const setStored = (key: string, val: string) => {
  sessionStorage.setItem(key, val);
  localStorage.setItem(key, val);
};

const removeStored = (key: string) => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const useAuthStore = defineStore('auth', () => {
  const initialUser = getStored('user');
  const user = ref(initialUser ? JSON.parse(initialUser) : null);
  const token = ref(getStored('token'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin');
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin');

  const clearState = () => {
    token.value = '';
    user.value = null;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', clearState);
  }

  async function login(credentials: { cin: string; phone: string }) {
    try {
      const data = await authApi.login(credentials);
      token.value = data.access_token;
      user.value = data.user;
      
      setStored('token', data.access_token);
      setStored('user', JSON.stringify(data.user));
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await presenceApi.logout();
    } catch (error) {
      console.error('Presence logout failed:', error);
    }
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    token.value = '';
    user.value = null;
    removeStored('token');
    removeStored('user');
    router.push('/login');
  }

  async function fetchProfile() {
    if (!token.value) return false;
    try {
      await authApi.getProfile();
      return true;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        token.value = '';
        user.value = null;
        removeStored('token');
        removeStored('user');
      }
      return false;
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    login,
    logout,
    fetchProfile,
  };
});
