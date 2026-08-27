import axios from 'axios';
import router from '../router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/logout')) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
      router.push('/login');
    }
    if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      window.dispatchEvent(new CustomEvent('api-network-error'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { cin: string; phone: string }) => api.post('/auth/login', credentials).then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data),
  getProfile: () => api.get('/users/profile').then(res => res.data),
  verifyPassword: (password: string) => api.post('/auth/verify-password', { password }).then(res => res.data),
};

export const userApi = {
  getAll: () => api.get('/users').then(res => res.data),
  create: (data: any) => api.post('/users', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/users/${id}`).then(res => res.data),
  profile: () => api.get('/users/profile').then(res => res.data),
  updateProfile: (data: any) => api.patch('/users/me', data).then(res => res.data),
  changePassword: (data: any) => api.post('/users/change-password', data).then(res => res.data),
  revealPassword: (id: string, password: string) => api.post(`/users/${id}/reveal-password`, { password }).then(res => res.data),
};

export const logApi = {
  getAll: (params?: any) => api.get('/logs', { params }).then(res => res.data),
};

export const dashboardApi = {
  getStats: (params?: any) => api.get('/dashboard', { params }).then(res => res.data),
  getAppVersion: () => api.get('/version').then(res => res.data),
  dismissAlert: (key: string, password: string) => api.post('/dashboard/alerts/dismiss', { key, password }).then(res => res.data),
};

export const gpsApi = {
  getPositions: () => api.get('/gps/positions').then(res => res.data),
  getSpeedAlerts: (limit = 50) => api.get('/gps/speed-alerts', { params: { limit } }).then(res => res.data),
  deleteSpeedAlert: (id: string) => api.delete(`/gps/speed-alerts/${id}`).then(res => res.data),
  getKmToday: () => api.get('/gps/km-today').then(res => res.data),
  testSpeedAlert: (carId: string) => api.post('/gps/test-speed-alert', { carId }).then(res => res.data),
  deleteMileageAlert: (id: string) => api.delete(`/gps/km-alerts/${id}`).then(res => res.data),
  getHistory: (carId: string, from?: string, to?: string, limit = 10000) =>
    api.get(`/gps/history/${carId}`, { params: { from, to, limit } }).then(res => res.data),
  getHistoryStats: (carId: string, from?: string, to?: string) =>
    api.get(`/gps/history/${carId}/stats`, { params: { from, to } }).then(res => res.data),
};

export const carApi = {
  getAll: (params?: any) => api.get('/cars', { params }).then(res => res.data),
  getOne: (id: string) => api.get(`/cars/${id}`).then(res => res.data),
  getAvailableSearch: (startDate: string, endDate: string) => api.get('/cars/available-search', { params: { startDate, endDate } }).then(res => res.data),
  create: (data: any) => api.post('/cars', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/cars/${id}`, data).then(res => res.data),
  updateStatus: (id: string, isAvailable: boolean) => api.patch(`/cars/${id}/status`, { isAvailable }).then(res => res.data),
  delete: (id: string, password: string) => api.delete(`/cars/${id}`, { data: { password } }).then(res => res.data),
  addDocument: (id: string, data: any) => api.post(`/cars/${id}/documents`, data).then(res => res.data),
  removeDocument: (id: string, documentId: string, password: string) => api.delete(`/cars/${id}/documents/${documentId}`, { params: { password } }).then(res => res.data),
};

export const contratApi = {
  getAll: (params?: any) => api.get('/contrats', { params }).then(res => res.data),
  getOne: (id: string) => api.get(`/contrats/${id}`).then(res => res.data),
  create: (data: any) => api.post('/contrats', data).then(res => res.data),
  getPdf: (id: string) => api.get(`/contrats/${id}/pdf`, { responseType: 'blob' }).then(res => res.data),
  close: (id: string, data: any) => api.patch(`/contrats/${id}/close`, data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/contrats/${id}`, data).then(res => res.data),
  remove: (id: string, password: string) => api.delete(`/contrats/${id}`, { data: { password } }).then(res => res.data),
};

export const reservationApi = {
  getAll: (params?: any) => api.get('/reservations', { params }).then(res => res.data),
  getOne: (id: string) => api.get(`/reservations/${id}`).then(res => res.data),
  create: (data: any) => api.post('/reservations', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/reservations/${id}`, data).then(res => res.data),
  confirm: (id: string, force = false) => api.patch(`/reservations/${id}/confirm`, null, { params: { force } }).then(res => res.data),
  updateStatus: (id: string, status: string, contratId?: string) => api.patch(`/reservations/${id}/status`, { status, contratId }).then(res => res.data),
  delete: (id: string) => api.delete(`/reservations/${id}`).then(res => res.data),

  forceDelete: (id: string, password: string) => api.delete(`/reservations/${id}/force`, { data: { password } }).then(res => res.data),
};

export const clientApi = {
  getAll: (params?: any) => api.get('/clients', { params }).then(res => res.data),
  getOne: (id: string) => api.get(`/clients/${id}`).then(res => res.data),
  create: (data: any) => api.post('/clients', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/clients/${id}`, data).then(res => res.data),
  delete: (id: string, password: string) => api.delete(`/clients/${id}`, { data: { password } }).then(res => res.data),
  getPdf: (id: string) => api.get(`/clients/${id}/pdf`, { responseType: 'blob' }).then(res => res.data),
};

export const depenseApi = {
  getAll: (carId?: string) => api.get('/depenses', { params: { carId } }).then(res => res.data),
  create: (data: any) => api.post('/depenses', data).then(res => res.data),
  bulkCreate: (data: any[]) => api.post('/depenses/bulk', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/depenses/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/depenses/${id}`).then(res => res.data),
};

export const visiteApi = {
  getAll: (params?: any) => api.get('/visites', { params }).then(res => res.data),
  create: (data: any) => api.post('/visites', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/visites/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/visites/${id}`).then(res => res.data),
};

export const vidangeApi = {
  getAll: (params?: any) => api.get('/vidanges', { params }).then(res => res.data),
  create: (data: any) => api.post('/vidanges', data).then(res => res.data),
  delete: (id: string) => api.delete(`/vidanges/${id}`).then(res => res.data),
};

export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
  }
}

export const settingApi = {
  get: () => api.get('/settings').then(res => res.data),
  update: (data: any) => api.patch('/settings', data).then(res => res.data),
};

export const agenceApi = {
  getAll: () => api.get('/agences').then(res => res.data),
  getOne: (id: string) => api.get(`/agences/${id}`).then(res => res.data),
  create: (data: any) => api.post('/agences', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/agences/${id}`, data).then(res => res.data),
  delete: (id: string, password?: string) => api.delete(`/agences/${id}`, { data: { password } }).then(res => res.data),
};

export const presenceApi = {
  online: () => api.get('/presence/online').then(res => res.data),
  heartbeat: (data?: any) => api.post('/presence/heartbeat', data || {}).then(res => res.data),
  logout: () => api.post('/presence/logout').then(res => res.data),
};

export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
