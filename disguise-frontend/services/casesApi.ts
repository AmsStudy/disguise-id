import api from './api';

export const casesApi = {
  list: async (params?: any) => {
    const response = await api.get('/cases', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/cases', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/cases/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, data: { status: string; notes?: string }) => {
    const response = await api.patch(`/cases/${id}/status`, data);
    return response.data;
  },

  addAlerts: async (id: string, data: { alertIds: string[] }) => {
    const response = await api.post(`/cases/${id}/alerts`, data);
    return response.data;
  },

  addNote: async (id: string, data: FormData) => {
    const response = await api.post(`/cases/${id}/notes`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
