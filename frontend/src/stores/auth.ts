import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref(localStorage.getItem('token') || '');

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(credentials: { cin: string; phone: string }) {
    try {
      const data = await authApi.login(credentials);
      token.value = data.access_token;
      user.value = data.user;
      
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return false;
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    fetchProfile,
  };
});
