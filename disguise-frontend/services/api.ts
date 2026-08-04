import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Watchlist
export const watchlistApi = {
  list: (params?: { page?: number; limit?: number; danger_level?: string; search?: string; is_deleted?: boolean }) =>
    api.get('/watchlist', { params }),
  get: (id: string) => api.get(`/watchlist/${id}`),
  create: (data: FormData) =>
    api.post('/watchlist', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Partial<{ full_name: string; alias: string[]; danger_level: string; description: string }>) =>
    api.patch(`/watchlist/${id}`, data),
  delete: (id: string) => api.delete(`/watchlist/${id}`),
  deactivate: (id: string) => api.post(`/watchlist/${id}/deactivate`),
  addPhoto: (id: string, formData: FormData) =>
    api.post(`/watchlist/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Cameras
export const cameraApi = {
  list: () => api.get('/cameras'),
  get: (id: string) => api.get(`/cameras/${id}`),
  create: (data: { name: string; location_name?: string; ip_address?: string; username?: string; password?: string; stream_url?: string }) => api.post('/cameras', data),
  update: (id: string, data: Partial<{ name: string; location_name?: string; ip_address?: string; username?: string; password?: string; stream_url?: string }>) => api.patch(`/cameras/${id}`, data),
  delete: (id: string) => api.delete(`/cameras/${id}`),
  testConnection: (id: string) => api.post(`/cameras/${id}/test-connection`),
  preview: (id: string) => api.get(`/cameras/${id}/preview`, { responseType: 'blob' }),
};

// Alerts
export const alertApi = {
  list: (params?: { status?: string; priority?: string; page?: number; limit?: number }) =>
    api.get('/alerts', { params }),
  get: (id: string) => api.get(`/alerts/${id}`),
  update: (id: string, data: { status: string; notes?: string }) => api.patch(`/alerts/${id}`, data),
  delete: (id: string) => api.delete(`/alerts/${id}`),
};

// Cases
export const caseApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => api.get('/cases', { params }),
  get: (id: string) => api.get(`/cases/${id}`),
  create: (data: { title: string; description?: string; caseNumber: string }) => api.post('/cases', data),
  update: (id: string, data: Partial<{ title: string; status: string; description: string }>) =>
    api.patch(`/cases/${id}`, data),
  addNote: (id: string, data: FormData) =>
    api.post(`/cases/${id}/notes`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  linkAlerts: (id: string, alertIds: string[]) => api.post(`/cases/${id}/alerts`, { alert_ids: alertIds }),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  detections: (params?: { period?: string; camera_id?: string }) => api.get('/analytics/detections', { params }),
  performance: () => api.get('/analytics/performance'),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
  modelVersions: () => api.get('/settings/model-versions'),
};

// Users
export const userApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: { email: string; name: string; role: string; password: string }) => api.post('/users', data),
  update: (id: string, data: Partial<{ name: string; role: string }>) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
