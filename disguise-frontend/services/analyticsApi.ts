import api from './api';

export const analyticsApi = {
  getDashboard: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data.data;
  },

  getDetections: async (period: string = '7d') => {
    const response = await api.get('/analytics/detections', { params: { period } });
    return response.data.data;
  },

  getPerformance: async () => {
    const response = await api.get('/analytics/performance');
    return response.data.data;
  },
};
