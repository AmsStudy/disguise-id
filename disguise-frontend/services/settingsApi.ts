import api from './api';

export interface OrgSettings {
  default_threshold?: number;
  alert_auto_assign?: boolean;
  notification_email?: string;
  retention_days_frames?: number;
  retention_days_events?: number;
}

export interface OrganizationWithSettings {
  id: string;
  name: string;
  code: string;
  plan: string;
  settings: OrgSettings;
}

export interface ModelVersion {
  id: string;
  version: string;
  description: string | null;
  isActive: boolean;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  getSettings: async (): Promise<OrganizationWithSettings> => {
    const response = await api.get('/settings');
    return response.data.data;
  },

  updateSettings: async (settings: OrgSettings): Promise<OrganizationWithSettings> => {
    const response = await api.patch('/settings', settings);
    return response.data.data;
  },

  getModelVersions: async (): Promise<ModelVersion[]> => {
    const response = await api.get('/settings/model-versions');
    return response.data.data;
  },

  activateModelVersion: async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/settings/model-versions/${id}/activate`);
    return response.data.data;
  },
};
