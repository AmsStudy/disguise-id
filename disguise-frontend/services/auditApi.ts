import api from './api';

export const auditApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/audit', { params });
    return response.data;
  },
};
