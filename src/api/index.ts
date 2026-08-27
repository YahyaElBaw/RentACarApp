import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { discoverServer, getServerUrl as getCachedUrl } from '../utils/serverDiscovery';

let discoveryDone = false;

async function ensureDiscovery(): Promise<void> {
  if (discoveryDone) return;
  await discoverServer();
  discoveryDone = true;
}

const api = axios.create({ timeout: 8000 });

api.interceptors.request.use(async (config) => {
  try {
    await ensureDiscovery();

    const token = await SecureStore.getItemAsync('token');
    const serverUrl = getCachedUrl();

    config.baseURL = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('[API Interceptor Error]', err);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/logout')
    ) {
      const { useAuthStore } = require('../store/useAuthStore');
      await useAuthStore.getState().logout();
    }

    const isNetworkError = !error.response && error.code !== 'ERR_CANCELED';
    if (isNetworkError) {
      console.log(`[API] Network error on ${error.config?.url}, re-discovering...`);
      discoveryDone = false;
      try {
        const freshUrl = await discoverServer();
        discoveryDone = true;
        console.log(`[API] Re-discovered: ${freshUrl}`);
        if (error.config) {
          error.config.baseURL = freshUrl.endsWith('/')
            ? freshUrl.slice(0, -1)
            : freshUrl;
          return axios.request(error.config);
        }
      } catch (e) {
        console.log(`[API] Re-discovery failed: ${e}`);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { cin: string; phone: string }) =>
    api.post('/auth/login', credentials).then((res) => res.data),
  logout: () => api.post('/auth/logout').then((res) => res.data),
  getProfile: () => api.get('/users/profile').then((res) => res.data),
  verifyPassword: (password: string) =>
    api.post('/auth/verify-password', { password }).then((res) => res.data),
};

export const carApi = {
  getAll: (params?: any) => api.get('/cars', { params }).then((res) => res.data),
  getOne: (id: string) => api.get(`/cars/${id}`).then((res) => res.data),
};

export const reservationApi = {
  getAll: (params?: any) =>
    api.get('/reservations', { params }).then((res) => res.data),
  create: (data: any) =>
    api.post('/reservations', data).then((res) => res.data),
};

export const contratApi = {
  getAll: (params?: any) =>
    api.get('/contrats', { params }).then((res) => res.data),
  close: (id: string, data: any) =>
    api.patch(`/contrats/${id}/close`, data).then((res) => res.data),
};

export const dashboardApi = {
  getStats: (params?: any) =>
    api.get('/dashboard', { params }).then((res) => res.data),
  dismissAlert: (key: string, password: string) =>
    api.post('/dashboard/alerts/dismiss', { key, password }).then((res) => res.data),
};

export const gpsApi = {
  getPositions: () =>
    api.get('/gps/positions').then((res) => res.data),
  getKmToday: () =>
    api.get('/gps/km-today').then((res) => res.data),
  getSpeedAlerts: (limit = 20) =>
    api.get(`/gps/speed-alerts?limit=${limit}`).then((res) => res.data),
  testSpeedAlert: (carId: string) =>
    api.post('/gps/test-speed-alert', { carId }).then((res) => res.data),
};

export const clientApi = {
  getAll: (params?: any) =>
    api.get('/clients', { params }).then((res) => res.data),
  getOne: (id: string) => api.get(`/clients/${id}`).then((res) => res.data),
  create: (data: any) =>
    api.post('/clients', data).then((res) => res.data),
  update: (id: string, data: any) =>
    api.patch(`/clients/${id}`, data).then((res) => res.data),
  delete: (id: string, password: string) =>
    api
      .delete(`/clients/${id}`, { data: { password } })
      .then((res) => res.data),
};

export const uploadApi = {
  upload: (uri: string, filename: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as any);
    return api
      .post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
};

export const presenceApi = {
  online: () => api.get('/presence/online').then((res) => res.data),
};

export default api;
