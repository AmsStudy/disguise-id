import api from './api';

export const usersApi = {
  list: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  resetPassword: async (id: string, new_password: string) => {
    const response = await api.post(`/users/${id}/reset-password`, { new_password });
    return response.data;
  },
};
